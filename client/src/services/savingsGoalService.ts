import api from '../api/api';

export interface SavingsGoal {
  _id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  startDate: Date;
  targetDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'in_progress' | 'achieved' | 'behind_schedule' | 'cancelled';
  contributions: {
    amount: number;
    date: Date;
    note?: string;
  }[];
  autoContribute?: {
    enabled: boolean;
    amount?: number;
    frequency?: 'weekly' | 'monthly';
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  progressPercentage?: number;
  remainingAmount?: number;
  monthlyRequiredSavings?: number;
}

export interface CreateSavingsGoalDTO {
  name: string;
  targetAmount: number;
  targetDate: Date;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  autoContribute?: {
    enabled: boolean;
    amount?: number;
    frequency?: 'weekly' | 'monthly';
  };
}

export interface UpdateSavingsGoalDTO {
  name?: string;
  targetAmount?: number;
  targetDate?: Date;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  autoContribute?: {
    enabled: boolean;
    amount?: number;
    frequency?: 'weekly' | 'monthly';
  };
}

export interface ContributionDTO {
  amount: number;
  note?: string;
}

// Get all savings goals
export const getGoals = async (): Promise<SavingsGoal[]> => {
  try {
    const response = await api.get('/goals');
    
    // Parse date strings into Date objects
    return (response.data.data.goals || []).map((goal: any) => ({
      ...goal,
      startDate: new Date(goal.startDate),
      targetDate: new Date(goal.targetDate),
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt),
      contributions: (goal.contributions || []).map((contribution: any) => ({
        ...contribution,
        date: new Date(contribution.date)
      }))
    }));
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    throw error;
  }
};

// Get a specific savings goal by ID
export const getGoal = async (id: string): Promise<SavingsGoal | null> => {
  try {
    const response = await api.get(`/goals/${id}`);
    const goal = response.data.data.goal;
    
    if (!goal) return null;
    
    return {
      ...goal,
      startDate: new Date(goal.startDate),
      targetDate: new Date(goal.targetDate),
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt),
      contributions: (goal.contributions || []).map((contribution: any) => ({
        ...contribution,
        date: new Date(contribution.date)
      }))
    };
  } catch (error) {
    console.error(`Error fetching savings goal ${id}:`, error);
    return null;
  }
};

// Create a new savings goal
export const createGoal = async (data: CreateSavingsGoalDTO): Promise<SavingsGoal> => {
  try {
    const response = await api.post('/goals', data);
    const goal = response.data.data.goal;
    
    return {
      ...goal,
      startDate: new Date(goal.startDate),
      targetDate: new Date(goal.targetDate),
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt),
      contributions: (goal.contributions || []).map((contribution: any) => ({
        ...contribution,
        date: new Date(contribution.date)
      }))
    };
  } catch (error) {
    console.error('Error creating savings goal:', error);
    throw error;
  }
};

// Update a savings goal
export const updateGoal = async (id: string, data: UpdateSavingsGoalDTO): Promise<SavingsGoal> => {
  try {
    const response = await api.patch(`/goals/${id}`, data);
    const goal = response.data.data.goal;
    
    return {
      ...goal,
      startDate: new Date(goal.startDate),
      targetDate: new Date(goal.targetDate),
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt),
      contributions: (goal.contributions || []).map((contribution: any) => ({
        ...contribution,
        date: new Date(contribution.date)
      }))
    };
  } catch (error) {
    console.error(`Error updating savings goal ${id}:`, error);
    throw error;
  }
};

// Delete a savings goal
export const deleteGoal = async (id: string): Promise<boolean> => {
  try {
    await api.delete(`/goals/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting savings goal ${id}:`, error);
    return false;
  }
};

// Add a contribution to a savings goal
export const addContribution = async (id: string, data: ContributionDTO): Promise<SavingsGoal> => {
  try {
    const response = await api.post(`/goals/${id}/contribute`, data);
    const goal = response.data.data.goal;
    
    return {
      ...goal,
      startDate: new Date(goal.startDate),
      targetDate: new Date(goal.targetDate),
      createdAt: new Date(goal.createdAt),
      updatedAt: new Date(goal.updatedAt),
      contributions: (goal.contributions || []).map((contribution: any) => ({
        ...contribution,
        date: new Date(contribution.date)
      }))
    };
  } catch (error) {
    console.error(`Error adding contribution to savings goal ${id}:`, error);
    throw error;
  }
};

// For convenience, the wrapped service object
export const savingsGoalService = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  addContribution
};

export default savingsGoalService; 