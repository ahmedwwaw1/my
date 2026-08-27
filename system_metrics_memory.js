/**
 * Engine 7 & 8: Archive (Memory) and Balance (Cost & Metrics) Engine.
 * Manages operational history and tracks resource usage.
 */

window.SystemMetricsMemory = {
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
        // In browser, use localStorage or console for now
        let logs = JSON.parse(localStorage.getItem('system_logs') || '[]');
        logs.push(logEntry);
        localStorage.setItem('system_logs', JSON.stringify(logs.slice(-100)));
    },

    /**
     * Stores a successful solution in the persistent memory.
     * @param {string} problemKey - Keyword or ID for the problem.
     * @param {string} solution - The code or logic that solved it.
     */
    storeMemory: function(problemKey, solution) {
        console.log(`🧠 [Engine 7] Archiving successful solution for: ${problemKey}`);
        let memory = JSON.parse(localStorage.getItem('ai_memory') || '{}');
        memory[problemKey] = {
            solution: solution,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem('ai_memory', JSON.stringify(memory));
    },

    /**
     * Retrieves a best practice or previous solution from memory.
     * @param {string} problemKey - The search keyword.
     * @returns {string|null} - The archived solution or null.
     */
    retrieveBestPractice: function(problemKey) {
        let memory = JSON.parse(localStorage.getItem('ai_memory') || '{}');
        return memory[problemKey] ? memory[problemKey].solution : null;
    }
};
