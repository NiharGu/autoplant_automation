from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/process-data', methods=['POST'])
def process_data():
    try:
        data = request.json
        
        # Extract your specific variables
        driver_name = data.get('driver_name')
        driver_license = data.get('driver_license')
        vehicle_num = data.get('vehicle_num')
        destination = data.get('destination')
        weight = data.get('weight')
        so_no = data.get('so_no')
        phone_num = data.get('phone_num')
        
        print(f"Received data:")
        print(f"Driver Name: {driver_name}")
        print(f"License: {driver_license}")
        print(f"Vehicle: {vehicle_num}")
        print(f"Destination: {destination}")
        print(f"Weight: {weight}")
        print(f"SO Number: {so_no}")
        print(f"Phone: {phone_num}")
        
        # Process your data here - add your processing logic
        processed_result = {
            'status': 'success',
            'message': 'Data processed successfully',
            'processed_data': {
                'driver_name': driver_name,
                'driver_license': driver_license,
                'vehicle_num': vehicle_num,
                'destination': destination,
                'weight': weight,
                'so_no': so_no,
                'phone_num': phone_num
            }
        }
        
        return jsonify(processed_result)
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Python server starting...")
    app.run(host='0.0.0.0', port=5000, debug=True)
