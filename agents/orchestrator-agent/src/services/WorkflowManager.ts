/**
 * Workflow Manager Service
 * 
 * Manages complex multi-step workflows with dependency management
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { Workflow, WorkflowStep, WorkflowType } from '../types/index.js';
import { AgentRegistry } from './AgentRegistry.js';

export class WorkflowManager {
  private workflows: Map<string, Workflow> = new Map();
  private agentRegistry: AgentRegistry;

  constructor(agentRegistry: AgentRegistry) {
    this.agentRegistry = agentRegistry;
  }

  /**
   * Create a new workflow
   */
  createWorkflow(name: string, description: string, steps: Omit<WorkflowStep, 'id' | 'status'>[]): Workflow {
    const workflowId = uuidv4();
    const workflow: Workflow = {
      id: workflowId,
      name,
      description,
      steps: steps.map(step => ({
        ...step,
        id: uuidv4(),
        status: 'pending',
      })),
      status: 'pending',
      context: {},
      createdAt: new Date(),
    };

    this.workflows.set(workflowId, workflow);
    return workflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, context: any = {}): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = 'running';
    workflow.context = { ...workflow.context, ...context };

    try {
      const completedSteps = new Set<string>();
      
      while (completedSteps.size < workflow.steps.length) {
        const readySteps = workflow.steps.filter(step => 
          step.status === 'pending' && 
          step.dependencies.every(dep => completedSteps.has(dep))
        );

        if (readySteps.length === 0) {
          throw new Error('Workflow deadlock: no steps can be executed');
        }

        // Execute ready steps sequentially (as per ADK constraints)
        for (const step of readySteps) {
          await this.executeStep(step, workflow.context);
          if (step.status === 'completed') {
            completedSteps.add(step.id);
          } else if (step.status === 'failed') {
            workflow.status = 'failed';
            throw new Error(`Workflow failed at step: ${step.id}`);
          }
        }
      }

      workflow.status = 'completed';
      workflow.completedAt = new Date();
      return workflow;

    } catch (error) {
      workflow.status = 'failed';
      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep, context: any): Promise<void> {
    step.status = 'running';

    try {
      const agent = this.agentRegistry.getAgent(step.agentId);
      if (!agent) {
        throw new Error(`Agent ${step.agentId} not found`);
      }

      // Prepare the request for A2A agent
      const request = {
        request: step.action,
        ...step.input,
        context: { ...context, stepId: step.id },
      };

      // Call the A2A agent
      const response = await axios.post(`${agent.url}/a2a/messages`, request, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      });

      step.result = response.data;
      step.status = 'completed';

    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Create predefined workflow by type
   */
  createPredefinedWorkflow(workflowType: WorkflowType): Workflow {
    switch (workflowType) {
      case 'carbon_credit_purchase':
        return this.createWorkflow(
          'Carbon Credit Purchase',
          'Complete carbon credit purchase workflow',
          [
            {
              agentId: 'wallet-balance-agent',
              action: 'Check wallet balance for carbon credit purchase',
              input: { context: 'carbon_credit_purchase' },
              dependencies: [],
            },
            {
              agentId: 'carbon-credit-negotiation-agent',
              action: 'Find best carbon credit deals',
              input: { context: 'purchase_negotiation' },
              dependencies: [],
            },
            {
              agentId: 'payment-agent',
              action: 'Process carbon credit payment',
              input: { context: 'carbon_credit_settlement' },
              dependencies: ['wallet-balance-agent', 'carbon-credit-negotiation-agent'],
            },
          ]
        );

      case 'portfolio_analysis':
        return this.createWorkflow(
          'Portfolio Analysis',
          'Comprehensive portfolio analysis and recommendations',
          [
            {
              agentId: 'wallet-balance-agent',
              action: 'Get comprehensive portfolio balance',
              input: { context: 'portfolio_analysis' },
              dependencies: [],
            },
            {
              agentId: 'carbon-credit-negotiation-agent',
              action: 'Analyze carbon credit opportunities',
              input: { context: 'investment_opportunities' },
              dependencies: [],
            },
          ]
        );

      case 'payment_processing':
        return this.createWorkflow(
          'Payment Processing',
          'Process payment with verification',
          [
            {
              agentId: 'wallet-balance-agent',
              action: 'Verify sufficient balance for payment',
              input: { context: 'payment_verification' },
              dependencies: [],
            },
            {
              agentId: 'payment-agent',
              action: 'Process payment transaction',
              input: { context: 'transaction_processing' },
              dependencies: ['wallet-balance-agent'],
            },
          ]
        );

      case 'general_orchestration':
        return this.createWorkflow(
          'General Orchestration',
          'General multi-agent coordination',
          [
            {
              agentId: 'wallet-balance-agent',
              action: 'General balance inquiry',
              input: { context: 'general_inquiry' },
              dependencies: [],
            },
          ]
        );

      default:
        throw new Error(`Unknown workflow type: ${workflowType}`);
    }
  }

  /**
   * Format workflow result for display
   */
  formatWorkflowResult(workflow: Workflow): string {
    let result = `🎯 **Workflow Complete: ${workflow.name}**\n\n`;
    result += `**Status:** ${workflow.status}\n`;
    result += `**Steps Completed:** ${workflow.steps.filter(s => s.status === 'completed').length}/${workflow.steps.length}\n\n`;

    result += `**Step Results:**\n`;
    workflow.steps.forEach((step, index) => {
      result += `${index + 1}. **${step.action}** (${step.status})\n`;
      if (step.result) {
        result += `   Result: ${JSON.stringify(step.result).substring(0, 200)}...\n`;
      }
      if (step.error) {
        result += `   Error: ${step.error}\n`;
      }
    });

    return result;
  }

  /**
   * Get workflow statistics
   */
  getStats(): { total: number; completed: number; failed: number; running: number } {
    const workflows = Array.from(this.workflows.values());
    return {
      total: workflows.length,
      completed: workflows.filter(w => w.status === 'completed').length,
      failed: workflows.filter(w => w.status === 'failed').length,
      running: workflows.filter(w => w.status === 'running').length,
    };
  }
}
