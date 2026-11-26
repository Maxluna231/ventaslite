<?php

namespace App\Http\Controllers;


use App\Models\Product;
use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', 'in:pagada,cancelada'],
        ]);

        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $sales = Sale::with(['user:id,name', 'branch:id,name,city'])
            ->when(! $isAdmin, fn ($q) => $q->where('user_id', $user->id))
            ->when($isAdmin && $request->filled('user_id'), fn ($q) => $q->where('user_id', $request->user_id))
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->branch_id))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('from'), fn ($q) => $q->where('sold_at', '>=', $request->date('from')->startOfDay()))
            ->when($request->filled('to'), fn ($q) => $q->where('sold_at', '<', $request->date('to')->addDay()->startOfDay()))
            ->orderByDesc('sold_at')
            ->paginate(20)
            ->withQueryString();

        return response()->json($sales);
    }

    public function show(Request $request, Sale $sale)
    {
        $user = $request->user();

        abort_if($user->role !== 'admin' && $sale->user_id !== $user->id, 403, 'No tienes permiso para ver esta venta.');

        return response()->json(
            $sale->load(['user:id,name', 'branch:id,name,city', 'items.product:id,sku,name'])
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'branch_id' => ['required', 'integer', 'exists:branches,id'],
            'customer_name' => ['required', 'string', 'max:120'],
            'payment_method' => ['required', 'in:efectivo,tarjeta,transferencia'],
            'items' => ['required', 'array', 'min:1', 'max:6'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $sale = DB::transaction(function () use ($data, $request) {
            $ids = collect($data['items'])->pluck('product_id')->sort()->values();

            // Bloquea las filas en orden de id para evitar vender el mismo stock dos veces
            $products = Product::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            $subtotal = 0;
            $lines = [];

            foreach ($data['items'] as $item) {
                $product = $products[$item['product_id']];

                if (! $product->active) {
                    throw ValidationException::withMessages([
                        'items' => "El producto {$product->name} está inactivo.",
                    ]);
                }
                if ($product->stock < $item['quantity']) {
                    throw ValidationException::withMessages([
                        'items' => "Stock insuficiente de {$product->name} (disponible: {$product->stock}).",
                    ]);
                }

                // Precio y totales se calculan en el servidor, en centavos
                $unitCents = (int) round((float) $product->price * 100);
                $lineCents = $unitCents * $item['quantity'];
                $subtotal += $lineCents;

                $lines[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_price' => number_format($unitCents / 100, 2, '.', ''),
                    'line_total' => number_format($lineCents / 100, 2, '.', ''),
                ];

                $product->decrement('stock', $item['quantity']);
            }

            $tax = (int) round($subtotal * 0.16);

            $sale = Sale::create([
                'folio' => 'TMP-' . uniqid(),
                'user_id' => $request->user()->id,
                'branch_id' => $data['branch_id'],
                'customer_name' => $data['customer_name'],
                'subtotal' => number_format($subtotal / 100, 2, '.', ''),
                'tax' => number_format($tax / 100, 2, '.', ''),
                'total' => number_format(($subtotal + $tax) / 100, 2, '.', ''),
                'payment_method' => $data['payment_method'],
                'status' => 'pagada',
                'sold_at' => now(),
            ]);

            $sale->update(['folio' => sprintf('VL-%06d', $sale->id)]);
            $sale->items()->createMany($lines);

            return $sale;
        });

        return response()->json(
            $sale->load(['branch:id,name,city', 'items.product:id,sku,name']),
            201
        );
    }

    public function cancel(Request $request, Sale $sale)
    {
        abort_if($request->user()->role !== 'admin', 403, 'Solo un administrador puede cancelar ventas.');

        DB::transaction(function () use ($sale) {
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->first();

            if ($sale->status === 'cancelada') {
                throw ValidationException::withMessages(['status' => 'La venta ya está cancelada.']);
            }

            foreach ($sale->items as $item) {
                Product::whereKey($item->product_id)->increment('stock', $item->quantity);
            }

            $sale->update(['status' => 'cancelada']);
        });

        return response()->json(['message' => 'Venta cancelada y stock regresado.']);
    }
}
