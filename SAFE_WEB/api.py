from django.http import JsonResponse
from django.db import connection
from datetime import datetime, timedelta, timezone
import json

# ----------------------------------------------------------------------
# --- ENDPOINT 1: DATA TERBARU (Live Data) ---
# ----------------------------------------------------------------------
def get_latest_data(request):
    """
    API untuk mendapatkan satu data sensor terbaru.
    URL: /api/v1/latest_data?device_id=sensor_002
    """
    target_device = request.GET.get('device_id')
    
    where_clause = ""
    params = []
    
    if target_device:
        where_clause = "WHERE raw_device_id = %s"
        params = [target_device]

    sql = f"""
    SELECT 
        EXTRACT(EPOCH FROM timestamp) AS timestamp, 
        temperature, 
        humidity, 
        raw_device_id,
        is_anomaly
    FROM 
        "SAFE_WEB_sensordata"
    {where_clause} 
    ORDER BY 
        timestamp DESC 
    LIMIT 1;
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            row = cursor.fetchone()

            if row:
                data = {
                    "timestamp": int(row[0]),
                    "temperature": float(row[1]),
                    "humidity": float(row[2]),
                    "device_id": row[3],
                    "is_anomaly": row[4]
                }
                return JsonResponse({"status": "success", "data": data})
            else:
                return JsonResponse({"status": "error", "message": "No data found"}, status=404)

    except Exception as e:
        print(f"Error in get_latest_data: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=500)


# ----------------------------------------------------------------------
# --- ENDPOINT 2: DATA HISTORIS (Untuk Grafik) ---
# ----------------------------------------------------------------------
def get_historical_data(request):
    """
    API untuk mendapatkan data historis (misal: 24 jam terakhir).
    URL: /api/v1/historical_data?device_id=sensor_002
    """
    target_device = request.GET.get('device_id')
    
    time_24_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    params = [time_24_hours_ago]
    device_filter = ""

    if target_device:
        device_filter = "AND raw_device_id = %s"
        params.append(target_device)
    
    sql = f"""
    SELECT 
        EXTRACT(EPOCH FROM timestamp) AS timestamp, 
        temperature, 
        humidity,
        is_anomaly
    FROM 
        "SAFE_WEB_sensordata"
    WHERE 
        timestamp >= %s 
        {device_filter} 
    ORDER BY 
        timestamp ASC
    LIMIT 500; 
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            historical_data = []
            for row in rows:
                historical_data.append({
                    "timestamp": int(row[0]),
                    "temperature": float(row[1]),
                    "humidity": float(row[2]),
                    "is_anomaly": row[3]
                })

            if historical_data:
                return JsonResponse({
                    "status": "success", 
                    "data": historical_data
                })
            else:
                return JsonResponse({"status": "error", "message": "No historical data found"}, status=404)

    except Exception as e:
        print(f"Error in get_historical_data: {e}")
        return JsonResponse({"status": "error", "message": str(e)}, status=500)