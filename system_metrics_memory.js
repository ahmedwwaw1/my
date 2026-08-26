/**
 * Engine 7 & 8: Archive (Memory) and Balance (Cost & Metrics) Engine.
 * Manages operational history and tracks resource usage.
 */

const fs = require('fs');
const path = require('path');

const MEMORY_FILE = path.join(__dirname, 'system_memory.json');

const SystemMetricsMemory = {
    /**
     * Logs operation metrics (tokens, time, cost).
     * @param {string} operationName - Name of the task executed.
     * @param {object} metrics - { tokens: number, timeMs: number, cost: number }
     */
    logOperationMetrics: function(operationName, metrics) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation: operationName,
            ...metrics
        };
        console.log(`⚖️ [Engine 8] Metric Log: ${operationName} | Tokens: ${metrics.tokens} | Time: ${metrics.timeMs}ms`);
        // Append to a local log file if needed
    },

    /**
     * Stores a successful solution in the persistent memory.
     * @param {string} problemKey - Keyword or ID for the problem.
     * @param {string} solution - The code or logic that solved it.
     */
    storeMemory: function(problemKey, solution) {
        console.log(`🧠 [Engine 7] Archiving successful solution for: ${problemKey}`);
        let memory = {};
        if (fs.existsSync(MEMORY_FILE)) {
            memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        }
        memory[problemKey] = {
            solution: solution,
            savedAt: new Date().toISOString()
        };
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
    },

    /**
     * Retrieves a best practice or previous solution from memory.
     * @param {string} problemKey - The search keyword.
     * @returns {string|null} - The archived solution or null.
     */
    retrieveBestPractice: function(problemKey) {
        if (!fs.existsSync(MEMORY_FILE)) return null;
        const memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
        return memory[problemKey] ? memory[problemKey].solution : null;
    }
};

module.exports = SystemMetricsMemory;
