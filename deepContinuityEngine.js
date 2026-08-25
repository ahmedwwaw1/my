/**
 * ============================================================================
 * 🛡️ DEEP CONTINUITY & SMART WAIT ENGINE (محرك الاستمرارية العميقة والانتظار الذكي)
 * ============================================================================
 * هذا الملف هو النواة البرمجية الدائمة والمسؤولة عن:
 * 1. حسّاس التوفر الذكي (Smart Availability Sensor).
 * 2. الاستمرارية العميقة ووضع الانتظار الذكي عند استنفاد الحصة (Smart Wait & Quota Recovery).
 * 3. الاستئناف التلقائي ونقاط التفتيش (Auto-Resumption & Checkpoints).
 * 4. الاستقلالية التنفيذية والتبديل بين النماذج (Multi-Model Autonomous Orchestration).
 */

class DeepContinuityEngine {
    constructor(options = {}) {
        this.modelsList = options.modelsList || [
            'gemini-3.7-flash',
            'gemini-3.6-flash',
            'gemini-3.5-flash-lite'
        ];
        this.maxGlobalRetries = options.maxGlobalRetries || 10;
        this.baseWaitTimeMs = options.baseWaitTimeMs || 15000; // 15 ثانية أساسية
        this.checkpointStorageKey = 'sovereign_task_checkpoint';
        this.isWaitingState = false;
    }

    /**
     * حفظ الحالة الحالية للمهمة (الاستئناف التلقائي)
     */
    saveCheckpoint(taskData) {
        try {
            const checkpoint = {
                timestamp: Date.now(),
                data: taskData,
                completed: false
            };
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.checkpointStorageKey, JSON.stringify(checkpoint));
            }
            return true;
        } catch (e) {
            console.warn('[DeepContinuity] Failed to save checkpoint:', e);
            return false;
        }
    }

    /**
     * استرجاع نقطة التوقف الأخيرة
     */
    loadCheckpoint() {
        try {
            if (typeof localStorage !== 'undefined') {
                const raw = localStorage.getItem(this.checkpointStorageKey);
                return raw ? JSON.parse(raw) : null;
            }
            return null;
        } catch (e) {
            console.warn('[DeepContinuity] Failed to load checkpoint:', e);
            return null;
        }
    }

    /**
     * مسح نقطة التوقف عند إنجاز المهمة بنجاح 100%
     */
    clearCheckpoint() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(this.checkpointStorageKey);
            }
        } catch (e) {
            console.warn('[DeepContinuity] Failed to clear checkpoint:', e);
        }
    }

    /**
     * حسّاس التوفر الذكي: فحص ما إذا كان النموذج متاحاً أو يعاني من ضغط
     */
    async smartAvailabilitySensor(model) {
        // فحص استباقي خفيف للنموذج (محاكاة ping أو فحص الحالة)
        console.log(`[Smart Availability Sensor] فحص جاهزية النموذج: ${model}`);
        return true; 
    }

    /**
     * تنفيذ المهمة بسلسلة العمليات المعقدة مع الانتظار الذكي والاستمرارية العميقة
     * @param {Function} executeFn - دالة التنفيذ الفعلية التي تستدعي النموذج
     * @param {Object} taskPayload - حمولة المهمة البرمجية
     */
    async executeWithContinuity(executeFn, taskPayload) {
        let currentModelIndex = 0;
        let globalAttempt = 0;

        // حفظ نقطة البداية للاستئناف التلقائي
        this.saveCheckpoint(taskPayload);

        while (globalAttempt < this.maxGlobalRetries) {
            let model = this.modelsList[currentModelIndex];

            try {
                // تفعيل حسّاس التوفر الذكي
                await this.smartAvailabilitySensor(model);

                console.log(`🚀 [الاستمرارية العميقة] جاري تنفيذ المهمة عبر النموذج: ${model}`);
                
                // تنفيذ المهمة الفعلية
                const result = await executeFn(model, taskPayload);

                // إنجاز ناجح بنسبة 100% - مسح نقطة التوقف
                this.clearCheckpoint();
                console.log(`✅ [نجاح تام] اكتملت المهمة بنجاح بواسطة النموذج: ${model}`);
                return result;

            } catch (error) {
                const isRateLimitOrQuota = 
                    (error.status === 429) || 
                    (error.message && (
                        error.message.includes('quota') || 
                        error.message.includes('rate limit') || 
                        error.message.includes('exhausted') ||
                        error.message.includes('capacity')
                    ));

                if (isRateLimitOrQuota || error) {
                    console.warn(`⚠️ [تحذير] النموذج ${model} وصل لحد الاستخدام أو واجه عقبة. التبديل للنموذج التالي...`);
                    
                    // التبديل للنموذج التالي في القائمة
                    currentModelIndex++;

                    // إذا استنفدت كافة النماذج في هذه الدورة
                    if (currentModelIndex >= this.modelsList.length) {
                        globalAttempt++;
                        currentModelIndex = 0; // العودة لرأس القائمة (Gemini 3.7 Flash)

                        this.isWaitingState = true;
                        let waitTime = globalAttempt * this.baseWaitTimeMs;

                        console.warn(`🛑 [الانتظار الذكي] تم استنفاد حصة كافة النماذج المتاحة!`);
                        console.warn(`⏳ [المسبار] النظام يدخل في وضع "الانتظار الذكي" لمدة ${waitTime / 1000} ثانية قبل إعادة المحاولة (الدورة ${globalAttempt}/${this.maxGlobalRetries})...`);

                        // الانتظار التصاعدي الذكي
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        this.isWaitingState = false;
                    }
                } else {
                    // خطأ برمجي غير متعلق بالحصة - رمي الخطأ للتعامل معه
                    throw error;
                }
            }
        }

        throw new Error(`❌ [فشل الاستمرارية العميقة]: تجاوز الحد الأقصى لدورات الانتظار الذكي (${this.maxGlobalRetries} دورات).`);
    }
}

// تصدير الكلاس للاستخدام في النظام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeepContinuityEngine;
}
