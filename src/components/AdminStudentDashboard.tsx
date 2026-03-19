/**
 * Admin Student Management Dashboard
 * React component for managing students, grades, courses, and attendance
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Space,
  message,
  Tabs,
  Tag,
  Popconfirm,
  Upload,
  Statistic,
  Charts,
  Timeline,
  Collapse
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  DownloadOutlined,
  UserAddOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './AdminDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

interface AdminStudent {
  _id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  major: string;
  level: number;
  status: string;
  gpa: number;
  createdAt: string;
}

interface StudentFormData {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  major: string;
  level: number;
  status: string;
}

const AdminStudentDashboard: React.FC = () => {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [form] = Form.useForm();
  const [courses, setCourses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('1');

  useEffect(() => {
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/students`, {
        params: { per_page: 100 }
      });
      setStudents(response.data.data);
    } catch (error) {
      message.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/courses`, {
        params: { per_page: 50 }
      });
      setCourses(response.data.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchGrades = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/grades`, {
        params: { per_page: 100 }
      });
      setGrades(response.data.data);
    } catch (error) {
      console.error('Error fetching grades:', error);
    }
  };

  const handleAddStudent = () => {
    setIsEditMode(false);
    setSelectedStudent(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditStudent = (student: AdminStudent) => {
    setIsEditMode(true);
    setSelectedStudent(student);
    form.setFieldsValue({
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      major: student.major,
      level: student.level,
      status: student.status
    });
    setIsModalVisible(true);
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/students/${studentId}`);
      message.success('Student deleted successfully');
      fetchStudents();
    } catch (error) {
      message.error('Failed to delete student');
    }
  };

  const handleSubmit = async (values: StudentFormData) => {
    try {
      if (isEditMode && selectedStudent) {
        await axios.put(`${API_BASE_URL}/students/${selectedStudent._id}`, values);
        message.success('Student updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/students`, values);
        message.success('Student created successfully');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchStudents();
    } catch (error) {
      message.error('Failed to save student');
    }
  };

  const handleEnrollStudent = async (studentId: string, courseId: string) => {
    try {
      await axios.post(`${API_BASE_URL}/courses/${courseId}/enroll`, {
        studentId
      });
      message.success('Student enrolled successfully');
      fetchCourses();
    } catch (error) {
      message.error('Failed to enroll student');
    }
  };

  const studentColumns = [
    {
      title: 'Student ID',
      dataIndex: 'studentId',
      key: 'studentId',
      width: 120,
      sorter: (a: any, b: any) => a.studentId.localeCompare(b.studentId)
    },
    {
      title: 'Name',
      key: 'name',
      width: 200,
      render: (_: any, record: AdminStudent) => `${record.firstName} ${record.lastName}`
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      render: (email: string) => (
        <span>
          <MailOutlined /> {email}
        </span>
      )
    },
    {
      title: 'Major',
      dataIndex: 'major',
      key: 'major',
      width: 120
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 60,
      sorter: (a: any, b: any) => a.level - b.level
    },
    {
      title: 'GPA',
      dataIndex: 'gpa',
      key: 'gpa',
      width: 80,
      render: (gpa: number) => (
        <span style={{ color: gpa >= 3.5 ? '#52c41a' : '#f5222d' }}>
          {gpa.toFixed(2)}
        </span>
      ),
      sorter: (a: any, b: any) => a.gpa - b.gpa
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const color = status === 'active' ? 'green' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: AdminStudent) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditStudent(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Student"
            description="Are you sure you want to delete this student?"
            onConfirm={() => handleDeleteStudent(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Button danger size="small" icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const gradeColumns = [
    {
      title: 'Student ID',
      dataIndex: ['studentId'],
      key: 'studentId',
      width: 120
    },
    {
      title: 'Course Code',
      dataIndex: ['courseId'],
      key: 'courseCode',
      width: 120
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
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'approved' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      )
    }
  ];

  return (
    <div className="admin-dashboard">
      {/* Statistics Section */}
      <Row gutter={[16, 16]} className="statistics-row">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Students"
              value={students.length}
              prefix={<UserAddOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Courses"
              value={courses.length}
              prefix="📚"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Grades"
              value={grades.length}
              prefix="📈"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg. GPA"
              value={(students.reduce((sum, s) => sum + s.gpa, 0) / students.length).toFixed(2)}
              prefix="🎯"
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
              label: 'Student Management',
              children: (
                <div className="tab-content">
                  <div className="action-buttons">
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddStudent}
                      >
                        Add Student
                      </Button>
                      <Button icon={<FileExcelOutlined />}>
                        Import Students
                      </Button>
                      <Button icon={<DownloadOutlined />}>
                        Export Report
                      </Button>
                      <Button icon={<PrinterOutlined />}>
                        Print
                      </Button>
                    </Space>
                  </div>
                  <Table
                    dataSource={students}
                    columns={studentColumns}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 1200 }}
                  />
                </div>
              )
            },
            {
              key: '2',
              label: 'Course Management',
              children: (
                <div className="tab-content">
                  <div className="action-buttons">
                    <Button type="primary" icon={<PlusOutlined />}>
                      Add Course
                    </Button>
                  </div>
                  <Table
                    dataSource={courses}
                    columns={[
                      {
                        title: 'Course Code',
                        dataIndex: 'courseCode',
                        key: 'code'
                      },
                      {
                        title: 'Course Name',
                        dataIndex: 'courseName',
                        key: 'name'
                      },
                      {
                        title: 'Credits',
                        dataIndex: 'credits',
                        key: 'credits',
                        width: 80
                      },
                      {
                        title: 'Instructor',
                        dataIndex: 'instructor',
                        key: 'instructor'
                      },
                      {
                        title: 'Enrolled/Capacity',
                        key: 'enrollment',
                        render: (_: any, record: any) =>
                          `${record.enrolled || 0}/${record.capacity}`
                      }
                    ]}
                    rowKey="_id"
                    pagination={{ pageSize: 10 }}
                  />
                </div>
              )
            },
            {
              key: '3',
              label: 'Grade Management',
              children: (
                <div className="tab-content">
                  <Table
                    dataSource={grades}
                    columns={gradeColumns}
                    rowKey="_id"
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 1000 }}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* Student Modal */}
      <Modal
        title={isEditMode ? 'Edit Student' : 'Add New Student'}
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="studentId"
                label="Student ID"
                rules={[{ required: true, message: 'Please enter student ID' }]}
              >
                <Input placeholder="STU20240001" disabled={isEditMode} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="active">Active</Select.Option>
                  <Select.Option value="inactive">Inactive</Select.Option>
                  <Select.Option value="graduated">Graduated</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, type: 'email' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="major"
                label="Major"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="Computer Science">Computer Science</Select.Option>
                  <Select.Option value="Engineering">Engineering</Select.Option>
                  <Select.Option value="Business">Business</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="level"
                label="Level"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value={1}>Level 1</Select.Option>
                  <Select.Option value={2}>Level 2</Select.Option>
                  <Select.Option value={3}>Level 3</Select.Option>
                  <Select.Option value={4}>Level 4</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminStudentDashboard;
