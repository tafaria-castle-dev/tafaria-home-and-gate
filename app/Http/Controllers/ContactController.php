<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\ContactPerson;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Contact::class);
        $query = Contact::with([
            'contactPersons',
            'opportunities' => fn($query) => $query->select(['id', 'contact_id', 'last_update_id'])->with('lastUpdate')
        ]);
        $page = $request->input('page', default: 0);
        $limit = $request->input('limit');

        if ($search = $request->query('searchQuery')) {
            $search = trim($search);
            $query->where('institution', 'like', "%{$search}%")
                ->orWhere('mobile', 'like', "%{$search}%")
                ->orWhereHas('contactPersons', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('title', 'like', "%{$search}%");
                });
        }

        $totalCount = $query->count();
        $query->orderBy('created_at', 'desc');

        if ($limit) {
            $results = $query->skip($page * $limit)->take($limit)->get();
            $totalPages = ceil($totalCount / $limit);
        } else {
            $results = $query->get();
            $totalPages = 1;
        }


        return response()->json([
            'results' => $results,
            'totalCount' => $totalCount,
            'totalPages' => $totalPages,
            'page' => $page,
            'hasMore' => $page < $totalPages - 1,
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Contact::class);
        $validated = $request->validate([
            'institution' => 'string|nullable',
            'mobile' => 'string|nullable',
            'type' => 'required|string|in:INDIVIDUAL,INSTITUTION',
            'contactPersons' => 'array|nullable',
            'contactPersons.*.first_name' => 'string|nullable',
            'contactPersons.*.last_name' => 'string|nullable',
            'contactPersons.*.email' => 'email|nullable',
            'contactPersons.*.phone' => 'string|nullable',
            'contactPersons.*.title' => 'string|nullable',
        ]);

        if (!empty($validated['contactPersons'])) {
            $validated['contact_persons'] = array_map(function ($person) {
                return [
                    'first_name' => $person['first_name'] ?? null,
                    'last_name' => $person['last_name'] ?? null,
                    'email' => $person['email'] ?? null,
                    'phone' => $person['phone'] ?? null,
                    'title' => $person['title'] ?? null,
                ];
            }, $validated['contactPersons']);
            unset($validated['contactPersons']);
        }

        $contact = Contact::create(array_merge(
            array_filter($validated, fn($key) => !in_array($key, ['contact_persons']), ARRAY_FILTER_USE_KEY),
            ['id' => Str::uuid()]
        ));

        if (!empty($validated['contact_persons'])) {
            foreach ($validated['contact_persons'] as $personData) {
                $filteredData = array_filter($personData, fn($value) => $value !== null);
                $contact->contactPersons()->create(array_merge(
                    $filteredData,
                    ['id' => Str::uuid(), 'contact_id' => $contact->id]
                ));
            }
        }

        $contact->load([
            'contactPersons',
            'opportunities' => fn($query) => $query->with('lastUpdate')
        ]);
        return response()->json($contact, 201);
    }

    public function show($id)
    {
        $contact = Contact::with([
            'contactPersons',
            'opportunities' => fn($query) => $query->with('lastUpdate')
        ])->findOrFail($id);
        $this->authorize('view', $contact);
        return response()->json($contact);
    }

    public function update(Request $request, $id)
    {
        $contact = Contact::findOrFail($id);
        $this->authorize('update', $contact);
        $validated = $request->validate([
            'institution' => 'string|nullable',
            'mobile' => 'string|nullable',
            'type' => 'string|in:INDIVIDUAL,INSTITUTION',
            'contactPersons' => 'array|nullable',
            'contactPersons.*.id' => 'string|nullable',
            'contactPersons.*.first_name' => 'sometimes|nullable|string',
            'contactPersons.*.last_name' => 'sometimes|nullable|string',
            'contactPersons.*.email' => 'email|nullable',
            'contactPersons.*.phone' => 'string|nullable',
            'contactPersons.*.title' => 'string|nullable',
        ]);

        $contact->update(array_filter($validated, fn($key) => !in_array($key, ['contactPersons']), ARRAY_FILTER_USE_KEY));

        $inputPersons = $validated['contactPersons'] ?? [];
        $existingIds = $contact->contactPersons->pluck('id')->toArray();
        $idsToKeep = [];

        foreach ($inputPersons as $person) {
            $data = [
                'first_name' => $person['first_name'] ?? null,
                'last_name' => $person['last_name'] ?? null,
                'email' => $person['email'] ?? null,
                'phone' => $person['phone'] ?? null,
                'title' => $person['title'] ?? null,
            ];

            if (isset($person['id']) && in_array($person['id'], $existingIds)) {
                $contact->contactPersons()->where('id', $person['id'])->update($data);
                $idsToKeep[] = $person['id'];
            } else {
                $filteredData = array_filter($data, fn($value) => $value !== null);
                $newId = Str::uuid();
                $newData = array_merge($filteredData, [
                    'id' => $newId,
                    'contact_id' => $contact->id,
                ]);
                $contact->contactPersons()->create($newData);
                $idsToKeep[] = $newId;
            }
        }

        if (!empty($idsToKeep)) {
            $contact->contactPersons()->whereNotIn('id', $idsToKeep)->delete();
        } else {
            $contact->contactPersons()->delete();
        }

        $contact->load([
            'contactPersons',
            'opportunities' => fn($query) => $query->select(['id', 'contact_id', 'last_update_id'])->with('lastUpdate')
        ]);
        return response()->json($contact);
    }

    public function destroy($id)
    {
        $contact = Contact::findOrFail($id);
        $this->authorize('delete', $contact);
        $contact->delete();
        return response()->json(null, 204);
    }
}