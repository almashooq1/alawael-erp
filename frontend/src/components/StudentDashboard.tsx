/**
 * Student Portal - Main Dashboard Component
 * React component for student dashboard with key metrics and navigation
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Tabs,
  Tag,
  Spin,
  message,
  Avatar,
  Progress,
  Table,
  Space,
  Drawer
} from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  UserOutlined,
  DownloadOutlined,
  BellOutlined
} from '@ant-design/icons';
import './StudentDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

interface Student {
  _id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  major: string;
  level: number;
  email: string;
  photo?: string;
  gpa: number;
  status: string;
}

interface Grade {
  _id: string;
  courseId: string;
  courseName: string;
  semester: string;
  letterGrade: string;
  gpa: number;
  totalScore: number;
}

interface Course {
  _id: string;
  courseCode: string;
  courseName: string;
  credits: number;
  instructor: string;
}

interface Schedule {
  _id: string;
  courseId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
}

const StudentDashboard: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('1');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const studentId = localStorage.getItem('studentId') || 'STU20240001';

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);

      // Fetch student details
      const studentRes = await axios.get(`${API_BASE_URL}/students/${studentId}`);
      setStudent(studentRes.data.data);

      // Fetch grades
      const gradesRes = await axios.get(`${API_BASE_URL}/grades/student/${studentId}`);
      setGrades(gradesRes.data.data);

      // Fetch schedule
      const scheduleRes = await axios.get(`${API_BASE_URL}/schedules/student/${studentId}`);
      setSchedule(scheduleRes.data.data);

      // Fetch courses
      const coursesRes = await axios.get(`${API_BASE_URL}/courses`);
      setCourses(coursesRes.data.data);

      message.success('Data loaded successfully');
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendanceRate = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/attendance/student/${studentId}/rate`,
        { params: { courseId: courses[0]?._id } }
      );
      return response.data.data.attendanceRate;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return 0;
    }
  };

  const generateTranscript = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transcripts/student/${studentId}`);
      // Create PDF and download
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(response.data.data, null, 2)));
      element.setAttribute('download', `transcript_${studentId}.json`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      message.success('Transcript downloaded');
    } catch (error) {
      message.error('Failed to generate transcript');
    }
  };

  const gradesColumns = [
    {
      title: 'Course Code',
      dataIndex: 'courseId',
      key: 'courseCode',
      width: 120
    },
    {
      title: 'Course Name',
      dataIndex: 'courseName',
      key: 'courseName'
    },
    {
      title: 'Semester',
      dataIndex: 'semester',
      key: 'semester',
      width: 120
    },
    {
      title: 'Score',
      dataIndex: 'totalScore',
      key: 'score',
      width: 100,
      render: (score: number) => `${score}%`
    },
    {
      title: 'Grade',
      dataIndex: 'letterGrade',
      key: 'grade',
      width: 80,
      render: (grade: string) => {
        let color = 'geekblue';
        if (grade === 'A') color = 'green';
        else if (grade === 'B') color = 'blue';
        else if (grade === 'C') color = 'orange';
        else if (grade === 'F') color = 'red';
        return <Tag color={color}>{grade}</Tag>;
      }
    },
    {
      title: 'GPA',
      dataIndex: 'gpa',
      key: 'gpa',
      width: 80
    }
  ];

  const scheduleColumns = [
    {
      title: 'Day',
      dataIndex: 'dayOfWeek',
      key: 'day',
      width: 100
    },
    {
      title: 'Time',
      key: 'time',
      width: 150,
      render: (_: any, record: Schedule) =>
        `${record.startTime} - ${record.endTime}`
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location'
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100
    }
  ];

  if (loading || !student) {
    return (
      <div className="student-dashboard loading">
        <Spin size="large" tip="Loading student data..." />
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      {/* Header Section */}
      <div className="dashboard-header">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card className="header-card">
              <Row align="middle" gutter={[24, 0]}>
                <Col xs={24} sm={4} md={3}>
                  <Avatar
                    size={120}
                    src={student.photo}
                    icon={<UserOutlined />}
                    className="student-avatar"
                  />
                </Col>
                <Col xs={24} sm={20} md={21}>
                  <div className="header-content">
                    <h1>{student.firstName} {student.lastName}</h1>
                    <p className="student-id">Student ID: {student.studentId}</p>
                    <p className="major">Major: {student.major}</p>
                    <Space>
                      <Tag color="blue">Level {student.level}</Tag>
                      <Tag color={student.status === 'active' ? 'green' : 'orange'}>
                        {student.status.toUpperCase()}
                      </Tag>
                    </Space>
                  </div>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Statistics Section */}
      <Row gutter={[16, 16]} className="statistics-row">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Current GPA"
              value={student.gpa}
              precision={2}
              prefix={student.gpa >= 3.5 ? '🎯' : '📊'}
              valueStyle={{ color: student.gpa >= 3.5 ? '#52c41a' : '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Credits"
              value={student.totalCredits || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed Courses"
              value={grades.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Attendance Rate"
              value={75}
              suffix="%"
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card className="main-content-card" style={{ marginTop: '24px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          items={[
            {
              key: '1',
              label: (
                <span>
                  <FileTextOutlined /> Grades & Transcripts
                </span>
              ),
              children: (
                <div className="tab-content">
                  <div className="action-buttons">
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={generateTranscript}
                    >
                      Download Transcript
                    </Button>
                  </div>
                  <Table
                    dataSource={grades}
                    columns={gradesColumns}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                  />
                </div>
              )
            },
            {
              key: '2',
              label: (
                <span>
                  <CalendarOutlined /> Class Schedule
                </span>
              ),
              children: (
                <div className="tab-content">
                  <Table
                    dataSource={schedule}
                    columns={scheduleColumns}
                    rowKey="_id"
                    pagination={false}
                    scroll={{ x: 600 }}
                  />
                </div>
              )
            },
            {
              key: '3',
              label: (
                <span>
                  <BellOutlined /> Announcements
                </span>
              ),
              children: (
                <div className="tab-content">
                  <div className="announcements">
                    <Card type="inner" title="Latest Announcements">
                      <p>No announcements at this time</p>
                    </Card>
                  </div>
                </div>
              )
            },
            {
              key: '4',
              label: (
                <span>
                  <BookOutlined /> Academic Progress
                </span>
              ),
              children: (
                <div className="tab-content">
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Card title="Grade Distribution">
                        {grades.length > 0 ? (
                          <div>
                            <p>Grades received: A={grades.filter(g => g.letterGrade === 'A').length}, B={grades.filter(g => g.letterGrade === 'B').length}, C={grades.filter(g => g.letterGrade === 'C').length}</p>
                          </div>
                        ) : (
                          <p>No grades yet</p>
                        )}
                      </Card>
                    </Col>
                    <Col span={24}>
                      <Card title="GPA Progress">
                        <Progress
                          type="circle"
                          percent={Math.round((student.gpa / 4) * 100)}
                          format={percent => `${student.gpa}/4.0`}
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Quick Actions Footer */}
      <div className="quick-actions" style={{ marginTop: '24px', textAlign: 'center' }}>
        <Space>
          <Button type="primary" icon={<FileTextOutlined />}>
            View Transcript
          </Button>
          <Button icon={<CalendarOutlined />}>
            Class Schedule
          </Button>
          <Button icon={<UserOutlined />}>
            Edit Profile
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default StudentDashboard;
