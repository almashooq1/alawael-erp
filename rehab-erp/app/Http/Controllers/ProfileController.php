<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Profile/Index');
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . auth()->id(),
            'phone' => 'nullable|string|max:20',
        ]);

        auth()->user()->update($validated);

        return back()->with('success', 'تم تحديث بيانات الحساب بنجاح');
    }

    public function password(Request $request): RedirectResponse
    {
        $request->validate([
            'current' => 'required|string',
            'new' => ['required', 'string', Password::min(8)],
            'confirm' => 'required|same:new',
        ]);

        if (!Hash::check($request->current, auth()->user()->password)) {
            return back()->withErrors(['current' => 'كلمة المرور الحالية غير صحيحة']);
        }

        auth()->user()->update([
            'password' => Hash::make($request->new),
        ]);

        return back()->with('success', 'تم تغيير كلمة المرور بنجاح');
    }
}
