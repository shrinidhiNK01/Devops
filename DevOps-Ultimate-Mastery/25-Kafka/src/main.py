from kafka import KafkaProducer, KafkaConsumer
import json

def start_producer():
    producer = KafkaProducer(bootstrap_servers=['localhost:9092'], value_serializer=lambda v: json.dumps(v).encode('utf-8'))
    producer.send('enterprise-events', {'status': 'active', 'system': 'core'})
    producer.flush()

def start_consumer():
    consumer = KafkaConsumer('enterprise-events', bootstrap_servers=['localhost:9092'], auto_offset_reset='earliest', group_id='core-group')
    for message in consumer:
        print(f"Received: {message.value}")
