<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');
Route::get('/dream-passes', function () {
    return Inertia::render('RedeemDreamPass');
})->name('dream-passes');
Route::get('/quotations/{id}', function ($id) {
    return Inertia::render('SharedQuotation', [
        'id' => $id,
        'name' => request()->query('name'),
    ]);
})->name('SharedQuotation');
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('home', function () {
        return Inertia::render('home');
    })->name('home');
});


require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
