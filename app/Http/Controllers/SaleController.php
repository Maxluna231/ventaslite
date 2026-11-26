<?php

namespace App\Http\Controllers;


use App\Models\Sale;
use Illuminate\Http\Request;

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
            // El vendedor SIEMPRE queda limitado a sus ventas, aunque mande otro user_id
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
}
