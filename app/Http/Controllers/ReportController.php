<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Branch;
use App\Models\Category;
use Illuminate\Support\Facades\Cache;

class ReportController extends Controller
{

    private function validateFilters(Request $request): void
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
        ]);
    }

    /** Periodo del filtro. Si no se manda, son los últimos 30 días. */
    private function period(Request $request): array
    {
        $from = $request->filled('from')
            ? Carbon::parse($request->from)->startOfDay()
            : now()->subDays(29)->startOfDay();

        $to = $request->filled('to')
            ? Carbon::parse($request->to)->startOfDay()
            : now()->startOfDay();

        return [$from, $to->copy()->addDay()]; // fin exclusivo
    }

    /** Ventas pagadas dentro del periodo, con alcance por rol y sucursal. */
    private function sales(Request $request, Carbon $from, Carbon $endExclusive)
    {
        $user = $request->user();

        return DB::table('sales')
            ->where('sales.status', 'pagada')
            ->where('sales.sold_at', '>=', $from)
            ->where('sales.sold_at', '<', $endExclusive)
            ->when($user->role !== 'admin', fn ($q) => $q->where('sales.user_id', $user->id))
            ->when($request->filled('branch_id'), fn ($q) => $q->where('sales.branch_id', $request->branch_id));
    }

    private function totals(Request $request, Carbon $from, Carbon $endExclusive): array
    {
        $row = $this->sales($request, $from, $endExclusive)
            ->selectRaw('COALESCE(SUM(sales.total), 0) AS total, COUNT(*) AS sales_count')
            ->first();

        $total = (float) $row->total;
        $count = (int) $row->sales_count;

        return [
            'total' => round($total, 2),
            'sales_count' => $count,
            'average_ticket' => $count > 0 ? round($total / $count, 2) : 0.0,
        ];
    }

    private function change(float $current, float $previous): ?float
    {
        return $previous > 0 ? round(($current - $previous) / $previous * 100, 1) : null;
    }
      /** Guarda el resultado 5 minutos; la clave incluye usuario, rol y filtros. */
      private function cached(Request $request, string $name, callable $callback)
    {
    $user = $request->user();
    $key = 'reports:' . $name . ':' . $user->id . ':' . $user->role . ':' . md5(json_encode($request->query()));

    return Cache::remember($key, now()->addMinutes(5), $callback);
}
    public function dashboard(Request $request)
    {
        $this->validateFilters($request);
        [$from, $end] = $this->period($request);

        $days = max(1, intdiv($end->timestamp - $from->timestamp, 86400));
        $prevFrom = $from->copy()->subDays($days);

        $current = $this->totals($request, $from, $end);
        $previous = $this->totals($request, $prevFrom, $from);

        return response()->json([
            'period' => [
                'from' => $from->toDateString(),
                'to' => $end->copy()->subDay()->toDateString(),
                'days' => $days,
            ],
            'previous_period' => [
                'from' => $prevFrom->toDateString(),
                'to' => $from->copy()->subDay()->toDateString(),
            ],
            'current' => $current,
            'previous' => $previous,
            'change_percent' => [
                'total' => $this->change($current['total'], $previous['total']),
                'sales_count' => $this->change($current['sales_count'], $previous['sales_count']),
                'average_ticket' => $this->change($current['average_ticket'], $previous['average_ticket']),
            ],
        ]);
    }

    public function monthly(Request $request)
    {
        $this->validateFilters($request);

        // Últimos 12 meses completos hasta hoy; solo respeta sucursal y rol
        $start = now()->startOfMonth()->subMonths(11);
        $end = now()->endOfMonth()->addSecond();

        $rows = $this->sales($request, $start, $end)
            ->selectRaw("DATE_FORMAT(sales.sold_at, '%Y-%m') AS month, SUM(sales.total) AS total, COUNT(*) AS sales_count")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $series = [];
        for ($i = 0; $i < 12; $i++) {
            $month = $start->copy()->addMonths($i)->format('Y-m');
            $series[] = [
                'month' => $month,
                'total' => round((float) ($rows[$month]->total ?? 0), 2),
                'sales_count' => (int) ($rows[$month]->sales_count ?? 0),
            ];
        }

        return response()->json($series);
    }

    public function topProducts(Request $request)
    {
        $this->validateFilters($request);
        $request->validate(['by' => ['nullable', 'in:units,amount']]);

        [$from, $end] = $this->period($request);
        $orderBy = $request->input('by', 'units');

        $rows = $this->sales($request, $from, $end)
            ->join('sale_items', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->groupBy('products.id', 'products.sku', 'products.name')
            ->selectRaw('products.sku, products.name, SUM(sale_items.quantity) AS units, SUM(sale_items.line_total) AS amount')
            ->orderByDesc($orderBy)
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'sku' => $r->sku,
                'name' => $r->name,
                'units' => (int) $r->units,
                'amount' => round((float) $r->amount, 2),
            ]);

        return response()->json($rows);
    }

public function sellers(Request $request)
{
    $this->validateFilters($request);
    [$from, $end] = $this->period($request);

    $rows = $this->cached($request, 'sellers', function () use ($request, $from, $end) {
        return $this->sales($request, $from, $end)
            ->join('users', 'users.id', '=', 'sales.user_id')
            ->groupBy('users.id', 'users.name')
            ->selectRaw('users.id, users.name, SUM(sales.total) AS total, COUNT(*) AS sales_count, AVG(sales.total) AS average_ticket')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'total' => round((float) $r->total, 2),
                'sales_count' => (int) $r->sales_count,
                'average_ticket' => round((float) $r->average_ticket, 2),
            ]);
    });

    return response()->json($rows);
}
    public function branchCategory(Request $request)
{
    $this->validateFilters($request);
    [$from, $end] = $this->period($request);

    $rows = $this->sales($request, $from, $end)
        ->join('sale_items', 'sale_items.sale_id', '=', 'sales.id')
        ->join('products', 'products.id', '=', 'sale_items.product_id')
        ->join('categories', 'categories.id', '=', 'products.category_id')
        ->join('branches', 'branches.id', '=', 'sales.branch_id')
        ->groupBy('branches.id', 'branches.name', 'categories.id', 'categories.name')
        ->selectRaw('branches.name AS branch, categories.name AS category, SUM(sale_items.line_total) AS amount')
        ->get();

    // Todas las categorías y sucursales, aunque no tengan ventas en el periodo
    $categories = Category::orderBy('name')->pluck('name');
    $branches = Branch::orderBy('name')
        ->when($request->filled('branch_id'), fn ($q) => $q->where('id', $request->branch_id))
        ->pluck('name');

    $byBranch = $rows->groupBy('branch');

    $table = $branches->map(function ($branch) use ($byBranch, $categories) {
        $byCategory = ($byBranch[$branch] ?? collect())->pluck('amount', 'category');
        $values = $categories->map(fn ($c) => round((float) ($byCategory[$c] ?? 0), 2))->all();

        return ['branch' => $branch, 'values' => $values, 'total' => round(array_sum($values), 2)];
    })->sortByDesc('total')->values();

    return response()->json(['categories' => $categories, 'rows' => $table]);
}
    public function margin(Request $request)
{
    $this->validateFilters($request);
    [$from, $end] = $this->period($request);

    $rows = $this->cached($request, 'margin', function () use ($request, $from, $end) {
        return $this->sales($request, $from, $end)
            ->join('sale_items', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->groupBy('categories.id', 'categories.name')
            ->selectRaw('categories.name AS category, SUM(sale_items.line_total) AS revenue, SUM((sale_items.unit_price - products.cost) * sale_items.quantity) AS gross_profit')
            ->orderByDesc('gross_profit')
            ->get()
            ->map(function ($r) {
                $revenue = (float) $r->revenue;
                $profit = (float) $r->gross_profit;

                return [
                    'category' => $r->category,
                    'revenue' => round($revenue, 2),
                    'gross_profit' => round($profit, 2),
                    'margin_percent' => $revenue > 0 ? round($profit / $revenue * 100, 1) : null,
                ];
            });
    });

    return response()->json($rows);
}
    public function export(Request $request, string $report)
    {
        $methods = [
            'monthly' => 'monthly',
            'dashboard' => 'dashboard',
            'top-products' => 'topProducts',
            'sellers' => 'sellers',
            'branch-category' => 'branchCategory',
            'margin' => 'margin',
        ];

        abort_unless(isset($methods[$report]), 404, 'Reporte no encontrado.');

        // Reutiliza el reporte: mismos filtros, mismo alcance por rol
        $data = $this->{$methods[$report]}($request)->getData(true);

       if ($report === 'dashboard') {
    $c = $data['current'];
    $p = $data['previous'];
    $ch = $data['change_percent'];

    $header = ['Métrica', 'Periodo actual', 'Periodo anterior', 'Cambio %'];
    $rows = [
        ['Ventas totales', $c['total'], $p['total'], $ch['total']],
        ['Número de ventas', $c['sales_count'], $p['sales_count'], $ch['sales_count']],
        ['Ticket promedio', $c['average_ticket'], $p['average_ticket'], $ch['average_ticket']],
    ];
} elseif ($report === 'branch-category') {
    $header = array_merge(['Sucursal'], $data['categories'], ['Total']);
    $rows = array_map(
        fn ($r) => array_merge([$r['branch']], $r['values'], [$r['total']]),
        $data['rows']
    );
} else {
    $header = $data ? array_keys($data[0]) : [];
    $rows = array_map('array_values', $data);
}

        $filename = "reporte-{$report}-" . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($header, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM para que Excel abra bien los acentos
            if ($header) {
                fputcsv($out, $header);
            }
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}