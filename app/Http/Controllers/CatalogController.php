<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function branches()
    {
        return Branch::orderBy('name')->get(['id', 'name', 'city']);
    }

    public function sellers(Request $request)
    {
        abort_if($request->user()->role !== 'admin', 403, 'Solo un administrador puede ver esta lista.');

        return User::orderBy('name')->get(['id', 'name']);
    }

    public function products()
    {
        return Product::where('active', true)->orderBy('name')->get(['id', 'sku', 'name', 'price', 'stock']);
    }
}