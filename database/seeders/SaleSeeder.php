<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class SaleSeeder extends Seeder
{
   private const TOTAL_SALES = 2500;

    public function run(): void
    {
        if (Sale::exists()) {
            return; // si se corre dos veces, no duplica ventas
        }

        $sellerIds = User::where('role', 'vendedor')->pluck('id')->all();

        // Dinero en centavos (enteros) para evitar errores de redondeo
        $products = Product::where('active', true)->get(['id', 'price'])
            ->map(fn ($p) => ['id' => $p->id, 'cents' => (int) round((float) $p->price * 100)])
            ->all();

        // La última sucursal vende claramente menos que las demás
        $weights = [35, 30, 25, 10];
        $branchPool = [];
        foreach (Branch::orderBy('id')->pluck('id')->values() as $i => $id) {
            $branchPool = array_merge($branchPool, array_fill(0, $weights[$i], $id));
        }

        // Fechas de los últimos 18 meses, ordenadas, con diciembre favorecido
        $start = strtotime('-18 months');
        $end = time();
        $timestamps = [];
        for ($i = 0; $i < self::TOTAL_SALES; $i++) {
            $timestamps[] = $this->randomTimestamp($start, $end);
        }
        sort($timestamps);

        $salesRows = [];
        $itemRows = [];
        $payments = ['efectivo', 'tarjeta', 'transferencia'];
        $itemCounts = [1, 1, 2, 2, 3, 3, 4, 4, 5, 6]; // 1 a 6 productos por venta

        foreach ($timestamps as $i => $ts) {
            $id = $i + 1;
            $soldAt = date('Y-m-d H:i:s', $ts);
            $itemsCount = $itemCounts[array_rand($itemCounts)];

            $subtotal = 0;
            foreach (Arr::random($products, $itemsCount) as $p) {
                $qty = random_int(1, 5);
                $line = $p['cents'] * $qty;
                $subtotal += $line;

                $itemRows[] = [
                    'sale_id' => $id,
                    'product_id' => $p['id'],
                    'quantity' => $qty,
                    'unit_price' => $this->money($p['cents']),
                    'line_total' => $this->money($line),
                    'created_at' => $soldAt,
                    'updated_at' => $soldAt,
                ];
            }

            $tax = (int) round($subtotal * 0.16);

            $salesRows[] = [
                'id' => $id,
                'folio' => sprintf('VL-%06d', $id),
                'user_id' => $sellerIds[array_rand($sellerIds)],
                'branch_id' => $branchPool[array_rand($branchPool)],
                'customer_name' => fake()->name(),
                'subtotal' => $this->money($subtotal),
                'tax' => $this->money($tax),
                'total' => $this->money($subtotal + $tax),
                'payment_method' => $payments[array_rand($payments)],
                'status' => random_int(1, 100) <= 5 ? 'cancelada' : 'pagada',
                'sold_at' => $soldAt,
                'created_at' => $soldAt,
                'updated_at' => $soldAt,
            ];
        }

        // Inserciones por lote dentro de una transacción
        DB::transaction(function () use ($salesRows, $itemRows) {
            foreach (array_chunk($salesRows, 500) as $chunk) {
                DB::table('sales')->insert($chunk);
            }
            foreach (array_chunk($itemRows, 1000) as $chunk) {
                DB::table('sale_items')->insert($chunk);
            }
        });
    }

    private function randomTimestamp(int $start, int $end): int
    {
        while (true) {
            $ts = random_int($start, $end);
            $weight = date('n', $ts) === '12' ? 1.0 : 0.45; // diciembre ~2x
            if (mt_rand() / mt_getrandmax() <= $weight) {
                return $ts;
            }
        }
    }

    private function money(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
