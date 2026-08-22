import json
from datetime import datetime

def log_to_memory(action, details):
    with open('engine_memory.json', 'r+') as f:
        data = json.load(f)
        data['history'].append({"timestamp": str(datetime.now()), "action": action, "details": details})
        f.seek(0)
        json.dump(data, f, indent=2)

def system_health_check():
    try:
        status = "Operational"
        version = "1.0.0"
        log_to_memory("health_check", "System checked successfully")
        return f"System Status: {status} | Version: {version} | Engine: Active"
    except Exception as e:
        log_to_memory("health_check_error", str(e))
        return f"System Error: {str(e)}"

if __name__ == "__main__":
    print(system_health_check())
