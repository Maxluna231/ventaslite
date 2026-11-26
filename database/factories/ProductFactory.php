<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
 public function definition(): array
    {
        $cost = fake()->randomFloat(2, 20, 800);

        return [
            'name' => ucfirst(fake()->words(3, true)),
            'cost' => $cost,
            'price' => round($cost * fake()->randomFloat(2, 1.25, 1.8), 2), // siempre mayor al costo
            'stock' => fake()->numberBetween(50, 500),
            'active' => true,
        ];
    }
}
