import api from '../api/api';

export interface Budget {
  _id: string;
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  notifications: {
    enabled: boolean;
    threshold: number;
  };
  currentSpending?: number;
  remainingAmount?: number;
  utilizationPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetDTO {
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  notifications?: {
    enabled: boolean;
    threshold: number;
  };
}

export interface UpdateBudgetDTO extends Partial<CreateBudgetDTO> {}

class BudgetService {
  async createBudget(budgetData: CreateBudgetDTO): Promise<Budget> {
    const response = await api.post('/budgets', budgetData);
    return response.data.data;
  }

  async getBudgets(period?: string): Promise<Budget[]> {
    const response = await api.get('/budgets', {
      params: { period }
    });
    console.log('Budget API Response:', response.data);
    return response.data.data || [];
  }

  async updateBudget(budgetId: string, updates: UpdateBudgetDTO): Promise<Budget> {
    const response = await api.patch(`/budgets/${budgetId}`, updates);
    return response.data.data;
  }

  async deleteBudget(budgetId: string): Promise<void> {
    await api.delete(`/budgets/${budgetId}`);
  }
}

export const budgetService = new BudgetService(); 