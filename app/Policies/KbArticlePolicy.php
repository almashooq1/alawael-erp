<?php

namespace App\Policies;

use App\Models\KbArticle;
use App\Models\User;

class KbArticlePolicy
{
    // عرض القائمة
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('article.view');
    }

    // عرض التفاصيل
    public function view(User $user, KbArticle $article): bool
    {
        return $user->hasPermission('article.view')
            && $user->branch_id === $article->branch_id;
    }

    // إنشاء جديد
    public function create(User $user): bool
    {
        return $user->hasPermission('article.create');
    }

    // تحديث
    public function update(User $user, KbArticle $article): bool
    {
        return $user->hasPermission('article.update')
            && $user->branch_id === $article->branch_id;
    }

    // حذف
    public function delete(User $user, KbArticle $article): bool
    {
        return $user->hasPermission('article.delete')
            && $user->branch_id === $article->branch_id;
    }

    // استعادة المحذوف
    public function restore(User $user, KbArticle $article): bool
    {
        return $user->hasPermission('article.restore');
    }

    // حذف نهائي
    public function forceDelete(User $user, KbArticle $article): bool
    {
        return $user->isAdmin();
    }
}
