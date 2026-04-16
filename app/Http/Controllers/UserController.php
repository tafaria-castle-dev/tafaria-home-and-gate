<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image as InterventionImage;
class UserController extends Controller
{

    public function index()
    {
        $this->authorize('viewAny', User::class);
        return User::where('deleted', false)->with('assistantClerkOpportunities:id,assistant_clerk_id,name')->get();
    }

    public function store(Request $request)
    {
        $this->authorize('create', User::class);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email|max:32',
            'phone_number' => 'required|unique:users,phone_number',
            'signature' => 'string|nullable',
            'password' => 'required|string|min:8',
            'role' => 'string|in:client,staff,admin,guard,super_staff'
        ]);

        $user = User::create([
            'id' => Str::uuid(),
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_number' => $validated['phone_number'],
            'signature' => $validated['signature'] ?? '',
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'] ?? 'staff'
        ]);

        return response()->json($user, 201);
    }

    public function show($id)
    {
        $user = User::findOrFail($id);
        $this->authorize('view', $user);
        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        // $emailPassword = $user->email_password ? decrypt($user->email_password) : null;
        $user = User::findOrFail($id);
        $this->authorize('update', $user);
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'email|unique:users,email,' . $id,
            'phone_number' => 'unique:users,phone_number,' . $id,
            'signature' => 'nullable|file|mimes:jpeg,png,jpg|max:20480',
            'password' => 'string|min:8|nullable',
            'pass_code' => 'string|min:4|max:6|nullable',
            'email_password' => 'string|min:8|nullable',
            'deleted' => 'boolean',
            'role' => 'string|in:client,staff,admin,guard,super_staff|nullable'
        ]);
        if (isset($validated['email_password'])) {
            $validated['email_password'] = encrypt($validated['email_password']);
        }
        if (isset($validated['pass_code'])) {
            $validated['pass_code'] = Hash::make($validated['pass_code']);
        }
        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }
        if ($request->hasFile('signature')) {
            if ($user->signature) {
                Storage::disk('public')->delete($user->signature);
            }

            $uploadedFile = $request->file('signature');
            $filename = time() . '_' . $uploadedFile->getClientOriginalName();
            $extension = $uploadedFile->getClientOriginalExtension();

            $img = InterventionImage::read($uploadedFile)->scale(width: 800);
            $path = 'signatures/' . $filename;
            $encodedImage = $this->encodeImage($img, $extension);

            Storage::disk('public')->put($path, $encodedImage);
            $updated_path = 'storage/' . $path;
            $validated['signature'] = $updated_path;
        }

        $user->update($validated);
        return response()->json($user);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $this->authorize('delete', $user);
        $user->update(['deleted' => true]);

        return response()->json(['message' => 'User marked as deleted.'], 200);
    }
    private function encodeImage($img, $extension)
    {
        $extension = strtolower($extension);

        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                return (string) $img->toJpeg(quality: 85);
            case 'png':
                return (string) $img->toPng();
            case 'gif':
                return (string) $img->toGif();
            default:
                return (string) $img->toJpeg(quality: 85);
        }
    }
}