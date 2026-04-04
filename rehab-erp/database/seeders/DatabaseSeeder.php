<?php

namespace Database\Seeders;

use App\Models\Patient;
use App\Models\TherapySession;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ===================== المستخدمون =====================
        $admin = User::firstOrCreate(
            ['email' => 'admin@rehab.com'],
            [
                'name' => 'مدير النظام',
                'password' => Hash::make('password'),
            ]
        );

        $therapist1 = User::firstOrCreate(
            ['email' => 'therapist1@rehab.com'],
            [
                'name' => 'أ. سارة الأحمدي',
                'password' => Hash::make('password'),
            ]
        );

        $therapist2 = User::firstOrCreate(
            ['email' => 'therapist2@rehab.com'],
            [
                'name' => 'أ. محمد الزهراني',
                'password' => Hash::make('password'),
            ]
        );

        // ===================== المرضى =====================
        $patientsData = [
            ['name' => 'عبدالله محمد العتيبي', 'birth_date' => '2018-03-15', 'gender' => 'male', 'phone' => '0501234567', 'diagnosis' => 'تأخر في النطق والكلام', 'status' => 'active'],
            ['name' => 'نورة سعد الغامدي', 'birth_date' => '2019-07-22', 'gender' => 'female', 'phone' => '0509876543', 'diagnosis' => 'اضطراب طيف التوحد', 'status' => 'active'],
            ['name' => 'فيصل أحمد الشمري', 'birth_date' => '2017-11-08', 'gender' => 'male', 'phone' => '0551112233', 'diagnosis' => 'شلل دماغي بسيط', 'status' => 'active'],
            ['name' => 'ريم خالد المطيري', 'birth_date' => '2020-01-30', 'gender' => 'female', 'phone' => '0554445566', 'diagnosis' => 'صعوبات تعلم', 'status' => 'active'],
            ['name' => 'يوسف علي القحطاني', 'birth_date' => '2016-09-12', 'gender' => 'male', 'phone' => '0557778899', 'diagnosis' => 'فرط الحركة وتشتت الانتباه', 'status' => 'active'],
            ['name' => 'لمياء عمر الدوسري', 'birth_date' => '2015-05-20', 'gender' => 'female', 'phone' => '0562223344', 'diagnosis' => 'تأخر حركي', 'status' => 'inactive'],
            ['name' => 'سلطان ناصر البقمي', 'birth_date' => '2021-12-05', 'gender' => 'male', 'phone' => '0565556677', 'diagnosis' => 'ضعف السمع', 'status' => 'active'],
            ['name' => 'هند إبراهيم الحربي', 'birth_date' => '2019-04-18', 'gender' => 'female', 'phone' => '0568889900', 'diagnosis' => 'اضطراب طيف التوحد', 'status' => 'active'],
            ['name' => 'براء عبدالعزيز السلمي', 'birth_date' => '2018-08-27', 'gender' => 'male', 'phone' => '0501122334', 'diagnosis' => 'تأخر في النطق', 'status' => 'discharged'],
            ['name' => 'دانة محمد العنزي', 'birth_date' => '2020-06-14', 'gender' => 'female', 'phone' => '0504455667', 'diagnosis' => 'صعوبات تعلم', 'status' => 'active'],
        ];

        $patients = [];
        foreach ($patientsData as $data) {
            $data['created_by'] = $admin->id;
            $data['nationality'] = 'سعودي';
            $data['start_date'] = now()->subMonths(rand(1, 12))->format('Y-m-d');
            $data['total_sessions'] = rand(15, 30);
            $patients[] = Patient::create($data);
        }

        // ===================== الجلسات =====================
        $types = ['individual', 'group', 'evaluation'];
        $statuses = ['completed', 'completed', 'completed', 'scheduled', 'cancelled', 'no_show'];
        $therapists = [$therapist1->id, $therapist2->id];

        foreach ($patients as $patient) {
            $sessionsCount = rand(5, 15);
            for ($i = 1; $i <= $sessionsCount; $i++) {
                $daysAgo = $sessionsCount - $i;
                $date = now()->subDays($daysAgo * 3)->format('Y-m-d');
                $status = $daysAgo === 0 ? 'scheduled' : $statuses[array_rand($statuses)];

                TherapySession::create([
                    'patient_id' => $patient->id,
                    'therapist_id' => $therapists[array_rand($therapists)],
                    'session_date' => $date,
                    'session_time' => sprintf('%02d:00:00', rand(8, 16)),
                    'duration' => [30, 45, 60][array_rand([30, 45, 60])],
                    'type' => $types[array_rand($types)],
                    'status' => $status,
                    'cost' => [150, 200, 250, 300][array_rand([150, 200, 250, 300])],
                    'paid' => $status === 'completed',
                    'session_number' => $i,
                    'created_by' => $admin->id,
                    'notes' => $i === 1 ? 'جلسة التقييم الأولي' : null,
                ]);
            }
        }

        $this->command->info('✅ تم إنشاء البيانات التجريبية بنجاح!');
        $this->command->info('👤 بيانات الدخول:');
        $this->command->info('   البريد: admin@rehab.com');
        $this->command->info('   كلمة المرور: password');
    }
}
