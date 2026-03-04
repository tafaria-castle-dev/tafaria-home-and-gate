<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Webpatser\Uuid\Uuid;
use Illuminate\Support\Facades\Storage;
class RegisteredUserController extends Controller
{


    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:32', 'min:6', 'unique:users'],
            'phone_number' => ['required', 'string', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'signature' => ['nullable', 'string'],
        ]);

        $signaturePath = null;
        if ($request->has('signature') && $request->signature) {
            $signaturePath = $this->storeSignatureImage($request->signature);
        }

        $user = new User();
        $user->id = Uuid::generate()->string;
        $user->name = $request->name;
        $user->email = $request->email;
        $user->signature = $signaturePath;
        $user->phone_number = $request->phone_number;
        $user->password = Hash::make($request->password);
        $user->role = 'staff';
        $user->save();

        Auth::login($user);
        event(new Registered($user));

        return Inertia::render('home', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    private function storeSignatureImage($base64Image)
    {
        if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $matches)) {
            $imageType = $matches[1];
            $imageData = substr($base64Image, strpos($base64Image, ',') + 1);
            $imageData = base64_decode($imageData);

            $filename = 'signatures/' . uniqid() . '.' . $imageType;

            Storage::disk('public')->put($filename, $imageData);
            $updated_path = 'storage/' . $filename;

            return $updated_path;
        }

        return null;
    }

}
