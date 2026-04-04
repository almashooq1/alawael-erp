<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->when(
                $request->search,
                fn($q, $v) =>
                $q->where('name', 'like', "%$v%")->orWhere('email', 'like', "%$v%")
            )
            ->when($request->role, fn($q, $v) => $q->where('role', $v))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => $request->only(['search', 'role']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'role' => 'required|in:admin,therapist,receptionist,accountant',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8',
        ]);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        return back()->with('success', 'تم إضافة المستخدم بنجاح');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'role' => 'required|in:admin,therapist,receptionist,accountant',
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8',
        ]);

        $data = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'phone' => $validated['phone'] ?? null,
        ];

        if (!empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        return back()->with('success', 'تم تحديث بيانات المستخدم');
    }

    public function toggle(User $user): RedirectResponse
    {
        // لا يمكن إيقاف المستخدم الحالي
        if ($user->id === auth()->id()) {
            return back()->with('error', 'لا يمكنك تعطيل حسابك الحالي');
        }

        $user->update(['is_active' => !$user->is_active]);

        $msg = $user->is_active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';

        return back()->with('success', $msg);
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'لا يمكنك حذف حسابك الحالي');
        }

        $user->delete();

        return back()->with('success', 'تم حذف المستخدم');
    }
}
