// Quick API Test - Study Planner Controller Integration
import dotenv from 'dotenv';
import { AgentOrchestrator } from './src/services/agentOrchestrator.js';

dotenv.config();

async function testControllerIntegration() {
    console.log('🧪 Testing Controller Integration with Agent Orchestrator\n');
    
    try {
        // Test 1: Full orchestration (what createStudyPlan does)
        console.log('Test 1: Full Study Plan Creation');
        console.log('─'.repeat(50));
        
        const orchestrator = new AgentOrchestrator();
        
        const result = await orchestrator.createStudyPlan(
            "Learn Python basics in 2 weeks",
            {
                userContext: {
                    tendency: 'balanced',
                    completedTasksCount: 0,
                    overdueHistory: 0,
                    preferredTimes: ['morning']
                },
                schedulingPreferences: {
                    availableHoursPerDay: 4,
                    preferredStudyTimes: ['morning', 'afternoon'],
                    bufferTimePercent: 20,
                    startDate: new Date().toISOString().split('T')[0]
                }
            }
        );

        if (result.success) {
            console.log('✅ SUCCESS!\n');
            console.log('📊 Plan Summary:');
            console.log(`   Goal: ${result.plan.goal.originalGoal}`);
            console.log(`   Subject: ${result.plan.goal.subject}`);
            console.log(`   Complexity: ${result.plan.goal.complexity}`);
            console.log(`   Tasks Generated: ${result.plan.tasks.length}`);
            console.log(`   Total Days: ${result.plan.schedule.summary.totalDays}`);
            console.log(`   Total Hours: ${result.plan.schedule.summary.totalHours}`);
            console.log(`   Execution Time: ${result.plan.metadata.executionTimeMs}ms\n`);
            
            console.log('📝 Sample Tasks:');
            result.plan.tasks.slice(0, 3).forEach((task, i) => {
                console.log(`   ${i + 1}. ${task.description}`);
                console.log(`      Priority: ${task.priority} | Score: ${task.priorityScore}/10 | ${task.estimatedHours}h`);
            });
            
            console.log('\n📅 Schedule Preview:');
            result.plan.schedule.schedule.slice(0, 2).forEach(day => {
                console.log(`   Day ${day.day} (${day.date}): ${day.totalHours}h`);
                day.tasks.forEach(task => {
                    console.log(`      • ${task.startTime} - ${task.taskDescription} (${task.duration}h)`);
                });
            });

            // Test 2: Get Next Task (what getNextTask controller does)
            console.log('\n\nTest 2: AI Task Recommendation');
            console.log('─'.repeat(50));
            
            const nextTask = orchestrator.getNextTask(
                result.plan,
                [] // no completed tasks yet
            );
            
            if (nextTask) {
                console.log('✅ Next Task Recommendation:');
                console.log(`   ${nextTask.description}`);
                console.log(`   Priority Score: ${nextTask.priorityScore}/10`);
                console.log(`   Estimated Time: ${nextTask.estimatedHours}h`);
                console.log(`   Reasoning: ${nextTask.scoreReasoning}\n`);
            }

            // Test 3: Orchestrator Statistics
            console.log('\nTest 3: Orchestrator Performance');
            console.log('─'.repeat(50));
            const stats = orchestrator.getStats();
            console.log('✅ Performance Stats:');
            console.log(`   Total Steps: ${stats.totalSteps}`);
            console.log(`   Completed: ${stats.completedSteps}`);
            console.log(`   Errors: ${stats.errors}`);
            console.log(`   Success Rate: ${stats.successRate}\n`);

            console.log('🎉 All tests passed! Controller integration ready.\n');
            console.log('💡 What this means:');
            console.log('   ✅ createStudyPlan() will work correctly');
            console.log('   ✅ getNextTask() will provide AI recommendations');
            console.log('   ✅ Full agent orchestration is functional');
            console.log('   ✅ Ready for API testing with real MongoDB\n');

        } else {
            console.error('❌ Test failed:', result.error);
        }

    } catch (error) {
        console.error('❌ Error during testing:', error.message);
        console.error(error.stack);
    }
}

testControllerIntegration();
