<?php

namespace App\Http\Controllers;

use App\Models\ContactPerson;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ContactPersonController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', ContactPerson::class);
        return ContactPerson::all();
    }

    public function store(Request $request)
    {
        $this->authorize('create', ContactPerson::class);
        $validated = $request->validate([
            'first_name' => 'string|nullable',
            'last_name' => 'string|nullable',
            'email' => 'string|nullable',
            'phone' => 'string|nullable',
            'title' => 'string|nullable',
            'contact_id' => 'string|nullable|exists:contacts,id',
            'contact_clerk' => 'string|nullable'
        ]);

        $contactPerson = ContactPerson::create(array_merge($validated, ['id' => Str::uuid()]));
        return response()->json($contactPerson, 201);
    }

    public function show($id)
    {
        $contactPerson = ContactPerson::findOrFail($id);
        $this->authorize('view', $contactPerson);
        return response()->json($contactPerson);
    }

    public function update(Request $request, $id)
    {
        $contactPerson = ContactPerson::findOrFail($id);
        $this->authorize('update', $contactPerson);
        $validated = $request->validate([
            'first_name' => 'string|nullable',
            'last_name' => 'string|nullable',
            'email' => 'string|nullable',
            'phone' => 'string|nullable',
            'title' => 'string|nullable',
            'contact_id' => 'string|nullable|exists:contacts,id',
            'contact_clerk' => 'string|nullable'
        ]);

        $contactPerson->update(array_filter($validated));
        return response()->json($contactPerson);
    }

    public function destroy($id)
    {
        $contactPerson = ContactPerson::findOrFail($id);
        $this->authorize('delete', $contactPerson);
        $contactPerson->delete();
        return response()->json(null, 204);
    }
}