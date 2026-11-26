<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VentasLiteTest extends TestCase
{
    use RefreshDatabase;

    private int $branchId;
    private int $productId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->branchId = DB::table('branches')->insertGetId([
            'name' => 'Sucursal Prueba', 'city' => 'Puebla',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $categoryId = DB::table('categories')->insertGetId([
            'name' => 'Abarrotes', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->productId = DB::table('products')->insertGetId([
            'sku' => 'SKU-TEST', 'name' => 'Producto de prueba', 'category_id' => $categoryId,
            'price' => 100.00, 'cost' => 60.00, 'stock' => 10, 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function usuario(string $role): User
    {
        return User::factory()->create(['role' => $role]);
    }

    private function crearVenta(User $vendedor, string $status = 'pagada', float $subtotal = 100): Sale
    {
        $tax = round($subtotal * 0.16, 2);

        return Sale::create([
            'folio' => 'T-' . uniqid(),
            'user_id' => $vendedor->id,
            'branch_id' => $this->branchId,
            'customer_name' => 'Cliente',
            'subtotal' => $subtotal,
            'tax' => $tax,
            'total' => $subtotal + $tax,
            'payment_method' => 'efectivo',
            'status' => $status,
            'sold_at' => now(),
        ]);
    }

    private function stock(): int
    {
        return (int) DB::table('products')->where('id', $this->productId)->value('stock');
    }

    private function payload(int $cantidad): array
    {
        return [
            'branch_id' => $this->branchId,
            'customer_name' => 'Cliente de prueba',
            'payment_method' => 'efectivo',
            'items' => [['product_id' => $this->productId, 'quantity' => $cantidad]],
        ];
    }

    public function test_registrar_venta_calcula_iva_y_descuenta_stock(): void
    {
        Sanctum::actingAs($this->usuario('vendedor'));

        $this->postJson('/api/sales', $this->payload(2))->assertCreated();

        $venta = Sale::first();
        $this->assertSame('200.00', number_format((float) $venta->subtotal, 2, '.', ''));
        $this->assertSame('32.00', number_format((float) $venta->tax, 2, '.', ''));
        $this->assertSame('232.00', number_format((float) $venta->total, 2, '.', ''));
        $this->assertSame(8, $this->stock());
    }

    public function test_no_se_vende_mas_de_lo_que_hay_en_stock(): void
    {
        Sanctum::actingAs($this->usuario('vendedor'));

        $this->postJson('/api/sales', $this->payload(11))->assertStatus(422);

        $this->assertSame(10, $this->stock());
        $this->assertSame(0, Sale::count());
    }

    public function test_cancelar_regresa_el_stock_y_solo_lo_hace_el_admin(): void
    {
        $vendedor = $this->usuario('vendedor');
        Sanctum::actingAs($vendedor);
        $id = $this->postJson('/api/sales', $this->payload(3))->json('id');
        $this->assertSame(7, $this->stock());

        $this->postJson("/api/sales/{$id}/cancel")->assertForbidden();

        Sanctum::actingAs($this->usuario('admin'));
        $this->postJson("/api/sales/{$id}/cancel")->assertOk();
        $this->assertSame(10, $this->stock());
        $this->assertSame('cancelada', Sale::find($id)->status);

        $this->postJson("/api/sales/{$id}/cancel")->assertStatus(422);
    }

    public function test_los_reportes_excluyen_las_ventas_canceladas(): void
    {
        $vendedor = $this->usuario('vendedor');
        $this->crearVenta($vendedor, 'pagada', 100);
        $this->crearVenta($vendedor, 'pagada', 100);
        $this->crearVenta($vendedor, 'cancelada', 500);

        Sanctum::actingAs($this->usuario('admin'));
        $hoy = now()->toDateString();

        $json = $this->getJson("/api/reports/dashboard?from={$hoy}&to={$hoy}")->assertOk()->json();

        $this->assertEquals(2, $json['current']['sales_count']);
        $this->assertEquals(232.0, $json['current']['total']);
    }

    public function test_el_vendedor_solo_ve_y_reporta_sus_ventas(): void
    {
        $uno = $this->usuario('vendedor');
        $dos = $this->usuario('vendedor');
        $this->crearVenta($uno);
        $this->crearVenta($dos);

        Sanctum::actingAs($uno);
        $hoy = now()->toDateString();

        $this->getJson('/api/sales')->assertOk()->assertJsonPath('total', 1);
        $this->getJson("/api/reports/dashboard?from={$hoy}&to={$hoy}")
            ->assertOk()->assertJsonPath('current.sales_count', 1);
    }

    public function test_el_login_se_bloquea_tras_cinco_intentos_fallidos(): void
    {
        $usuario = $this->usuario('vendedor');

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/login', ['email' => $usuario->email, 'password' => 'incorrecta'])
                ->assertStatus(401);
        }

        $this->postJson('/api/login', ['email' => $usuario->email, 'password' => 'incorrecta'])
            ->assertStatus(429);
    }
}