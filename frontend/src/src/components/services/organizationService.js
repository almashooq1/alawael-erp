import axios from 'axios';

const API_BASE = '/api/organization';

const organizationService = {
  // Get complete organization structure
  getStructure: async () => {
    try {
      const response = await axios.get(`${API_BASE}/structure`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching organization structure:', error);
      throw error;
    }
  },

  // Get all branches
  getBranches: async () => {
    try {
      const response = await axios.get(`${API_BASE}/branches`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  },

  // Get specific branch by ID
  getBranch: async branchId => {
    try {
      const response = await axios.get(`${API_BASE}/branches/${branchId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching branch:', error);
      throw error;
    }
  },

  // Get all departments
  getDepartments: async () => {
    try {
      const response = await axios.get(`${API_BASE}/departments`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  },

  // Get CEO/Chairman info
  getChairman: async () => {
    try {
      const response = await axios.get(`${API_BASE}/chairman`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching chairman info:', error);
      throw error;
    }
  },

  // Get branches with complete structure
  getBranchesWithStructure: async () => {
    try {
      const response = await axios.get(`${API_BASE}/branches`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching branches with structure:', error);
      return [];
    }
  },

  // Get rehabilitation center information
  getRehabCenters: async () => {
    try {
      const branches = await this.getBranches();
      return branches.filter(b => b.nameArabic.includes('تأهيل') || b.nameArabic.includes('إعاقة'));
    } catch (error) {
      console.error('Error fetching rehab centers:', error);
      throw error;
    }
  },

  // Get job positions with descriptions
  getJobPositions: async () => {
    try {
      const structure = await this.getStructure();
      const positions = [];

      // Extract from main departments
      structure.departments?.forEach(dept => {
        dept.sections?.forEach(section => {
          section.positions?.forEach(pos => {
            positions.push({
              id: `${section.id}_${pos.title}`,
              title: pos.title,
              department: dept.name,
              section: section.name,
              description: pos.description,
              requirements: pos.requirements,
              count: pos.count || 1,
            });
          });
        });
      });

      // Extract from branches
      structure.branches?.forEach(branch => {
        branch.departments?.forEach(dept => {
          dept.positions?.forEach(pos => {
            positions.push({
              id: `${branch.id}_${dept.id}_${pos.title}`,
              title: pos.title,
              branch: branch.nameArabic,
              department: dept.name,
              description: pos.description,
              requirements: pos.requirements,
              count: pos.count || 1,
            });
          });
        });
      });

      return positions;
    } catch (error) {
      console.error('Error fetching job positions:', error);
      throw error;
    }
  },

  // Export organization structure as JSON
  exportStructure: async (format = 'json') => {
    try {
      const structure = await this.getStructure();
      return structure;
    } catch (error) {
      console.error('Error exporting structure:', error);
      throw error;
    }
  },

  // Get employees by position (from localStorage)
  getEmployeesByPosition: positionTitle => {
    try {
      const employees = JSON.parse(localStorage.getItem('organizationEmployees') || '{}');
      return Object.values(employees).filter(emp => emp.position === positionTitle);
    } catch (error) {
      console.error('Error getting employees:', error);
      return [];
    }
  },

  // Get all employees
  getAllEmployees: () => {
    try {
      const employees = JSON.parse(localStorage.getItem('organizationEmployees') || '{}');
      return Object.values(employees);
    } catch (error) {
      console.error('Error getting all employees:', error);
      return [];
    }
  },

  // Add employee
  addEmployee: (positionId, name) => {
    try {
      const employees = JSON.parse(localStorage.getItem('organizationEmployees') || '{}');
      const key = `${positionId}_${Date.now()}`;
      employees[key] = {
        id: key,
        positionId,
        name,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('organizationEmployees', JSON.stringify(employees));
      return employees[key];
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  },

  // Delete employee
  deleteEmployee: employeeId => {
    try {
      const employees = JSON.parse(localStorage.getItem('organizationEmployees') || '{}');
      delete employees[employeeId];
      localStorage.setItem('organizationEmployees', JSON.stringify(employees));
      return true;
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  },

  // Get organization statistics
  getStatistics: async () => {
    try {
      const structure = await this.getStructure();
      const employees = this.getAllEmployees();

      let totalPositions = 0;
      let totalDepartments = 0;

      // Count departments
      totalDepartments += structure.departments?.length || 0;
      structure.branches?.forEach(branch => {
        totalDepartments += branch.departments?.length || 0;
      });

      // Count positions
      structure.departments?.forEach(dept => {
        dept.sections?.forEach(section => {
          totalPositions += section.positions?.length || 0;
        });
      });

      structure.branches?.forEach(branch => {
        branch.departments?.forEach(dept => {
          totalPositions += dept.positions?.length || 0;
        });
      });

      return {
        totalBranches: structure.branches?.length || 0,
        totalDepartments,
        totalPositions,
        totalEmployees: employees.length,
        branches: structure.branches?.map(b => ({ id: b.id, name: b.nameArabic })),
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  },
};

export default organizationService;
