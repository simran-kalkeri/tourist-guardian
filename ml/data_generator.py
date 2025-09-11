#!/usr/bin/env python3
"""
Tourist Safety Data Generator
Generates realistic synthetic data for training and testing the tourist safety models.
"""

import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
import uuid
import random
from dataclasses import dataclass, asdict
import argparse

@dataclass
class TouristProfile:
    tourist_id: str
    age: int
    sex: str
    nationality: str
    trip_start: str
    trip_end: str
    itinerary: List[Dict[str, Any]]
    emergency_contact_hash: str

@dataclass
class LocationEvent:
    tourist_id: str
    timestamp: str
    latitude: float
    longitude: float
    speed_m_s: float
    accuracy_m: float
    provider: str
    battery_pct: int
    device_status: str

@dataclass
class ModelFeatures:
    tourist_id: str
    timestamp: str
    time_of_day_bucket: str
    distance_from_itinerary: float
    time_since_last_fix: float
    avg_speed_last_15min: float
    area_risk_score: float
    prior_incidents_count: int
    days_into_trip: int
    is_in_restricted_zone: bool
    sos_flag: bool
    # Static features
    age: int
    sex_encoded: int  # M=0, F=1, Other=2
    days_trip_duration: int
    
@dataclass
class SafetyLabel:
    tourist_id: str
    timestamp: str
    safety_label: int  # 0-100
    incident_within_24h: bool

class TouristDataGenerator:
    def __init__(self, seed: int = 42):
        """Initialize the data generator with configurable parameters."""
        np.random.seed(seed)
        random.seed(seed)
        
        # Configuration parameters
        self.config = {
            'route_deviation_pct': 0.15,  # 15% of tourists deviate from route
            'sudden_dropout_pct': 0.05,   # 5% have sudden GPS dropouts
            'prolonged_inactivity_pct': 0.08,  # 8% have prolonged inactivity
            'gps_noise_std': 0.0001,      # GPS noise standard deviation
            'high_risk_area_pct': 0.1,    # 10% of areas are high risk
            'medium_risk_area_pct': 0.2,  # 20% medium risk
        }
        
        # Popular tourist destinations (lat, lng)
        self.destinations = [
            {"name": "Mysuru Palace", "lat": 12.3051, "lng": 76.6551, "risk": 0.1},
            {"name": "Chamundi Hills", "lat": 12.2724, "lng": 76.6731, "risk": 0.2},
            {"name": "Brindavan Gardens", "lat": 12.4244, "lng": 76.5743, "risk": 0.15},
            {"name": "St. Philomena's Church", "lat": 12.3167, "lng": 76.6415, "risk": 0.05},
            {"name": "Railway Station Area", "lat": 12.3079, "lng": 76.6421, "risk": 0.7},
            {"name": "Devaraja Market", "lat": 12.3024, "lng": 76.6541, "risk": 0.4},
            {"name": "Zoo", "lat": 12.3010, "lng": 76.6820, "risk": 0.1},
            {"name": "Outskirts Area", "lat": 12.2500, "lng": 76.7500, "risk": 0.8},
        ]
        
        self.nationalities = [
            'Indian', 'American', 'British', 'German', 'French', 
            'Japanese', 'Australian', 'Canadian', 'Italian', 'Spanish'
        ]
        
        self.device_statuses = ['active', 'screen_off', 'no_signal', 'low_power']
        self.providers = ['gps', 'wifi', 'cell']

    def generate_tourist_profile(self) -> TouristProfile:
        """Generate a single tourist profile."""
        tourist_id = str(uuid.uuid4())
        age = np.random.randint(18, 70)
        sex = np.random.choice(['M', 'F', 'Other'], p=[0.45, 0.45, 0.1])
        nationality = np.random.choice(self.nationalities)
        
        # Trip duration between 1-14 days
        trip_duration = np.random.randint(1, 15)
        trip_start = datetime.now() - timedelta(days=np.random.randint(0, 30))
        trip_end = trip_start + timedelta(days=trip_duration)
        
        # Generate itinerary (3-8 destinations)
        num_destinations = np.random.randint(3, 9)
        selected_destinations = np.random.choice(
            len(self.destinations), size=num_destinations, replace=False
        )
        
        itinerary = []
        current_time = trip_start
        for i, dest_idx in enumerate(selected_destinations):
            dest = self.destinations[dest_idx]
            # Add some random offset for variety
            lat_offset = np.random.normal(0, 0.01)
            lng_offset = np.random.normal(0, 0.01)
            
            arrival_time = current_time + timedelta(hours=np.random.randint(2, 8))
            itinerary.append({
                "lat": dest["lat"] + lat_offset,
                "lng": dest["lng"] + lng_offset,
                "planned_arrival_iso": arrival_time.isoformat(),
                "name": dest["name"]
            })
            current_time = arrival_time
            
        return TouristProfile(
            tourist_id=tourist_id,
            age=age,
            sex=sex,
            nationality=nationality,
            trip_start=trip_start.isoformat(),
            trip_end=trip_end.isoformat(),
            itinerary=itinerary,
            emergency_contact_hash=f"hash_{uuid.uuid4().hex[:16]}"
        )

    def calculate_area_risk(self, lat: float, lng: float) -> float:
        """Calculate area risk score based on location."""
        # Find closest destination and use its risk score
        min_distance = float('inf')
        risk_score = 0.3  # default medium risk
        
        for dest in self.destinations:
            distance = np.sqrt((lat - dest["lat"])**2 + (lng - dest["lng"])**2)
            if distance < min_distance:
                min_distance = distance
                risk_score = dest["risk"]
                
        # Add some noise
        risk_score += np.random.normal(0, 0.1)
        return np.clip(risk_score, 0.0, 1.0)

    def generate_location_trajectory(self, profile: TouristProfile, 
                                   apply_anomalies: bool = True) -> List[LocationEvent]:
        """Generate location trajectory for a tourist."""
        events = []
        trip_start = datetime.fromisoformat(profile.trip_start)
        trip_end = datetime.fromisoformat(profile.trip_end)
        
        # Determine if this tourist will have anomalies
        will_deviate = (np.random.random() < self.config['route_deviation_pct']) and apply_anomalies
        will_dropout = (np.random.random() < self.config['sudden_dropout_pct']) and apply_anomalies
        will_be_inactive = (np.random.random() < self.config['prolonged_inactivity_pct']) and apply_anomalies
        
        current_time = trip_start
        battery = 100
        last_location = None
        itinerary_idx = 0
        
        while current_time < trip_end and itinerary_idx < len(profile.itinerary):
            # Get target destination
            target = profile.itinerary[itinerary_idx]
            target_lat, target_lng = target["lat"], target["lng"]
            target_arrival = datetime.fromisoformat(target["planned_arrival_iso"])
            
            # If this is first location or we reached the target, move to it
            if last_location is None:
                current_lat, current_lng = target_lat, target_lng
            else:
                current_lat, current_lng = last_location
                
            # Add GPS noise
            current_lat += np.random.normal(0, self.config['gps_noise_std'])
            current_lng += np.random.normal(0, self.config['gps_noise_std'])
            
            # Apply route deviation
            if will_deviate and np.random.random() < 0.1:  # 10% chance per event
                deviation_distance = np.random.uniform(0.005, 0.02)  # 0.5-2km roughly
                angle = np.random.uniform(0, 2 * np.pi)
                current_lat += deviation_distance * np.cos(angle)
                current_lng += deviation_distance * np.sin(angle)
                
            # Generate location event
            speed = np.random.uniform(0.5, 15.0)  # 0.5 to 15 m/s (walking to vehicle)
            if will_be_inactive and np.random.random() < 0.05:  # Prolonged inactivity
                speed = 0.0
                
            accuracy = np.random.uniform(3.0, 50.0)  # 3-50 meter accuracy
            provider = np.random.choice(self.providers, p=[0.7, 0.2, 0.1])
            
            # Battery drain
            battery = max(0, battery - np.random.uniform(0.5, 2.0))
            if battery < 10:
                battery = 100  # Assume charging
                
            device_status = 'active'
            if battery < 20:
                device_status = 'low_power'
            elif np.random.random() < 0.1:
                device_status = np.random.choice(['screen_off', 'no_signal'])
                
            # Skip events for dropout simulation
            if will_dropout and np.random.random() < 0.02:  # 2% chance of dropout
                current_time += timedelta(minutes=np.random.randint(30, 180))
                continue
                
            event = LocationEvent(
                tourist_id=profile.tourist_id,
                timestamp=current_time.isoformat(),
                latitude=current_lat,
                longitude=current_lng,
                speed_m_s=speed,
                accuracy_m=accuracy,
                provider=provider,
                battery_pct=int(battery),
                device_status=device_status
            )
            
            events.append(event)
            last_location = (current_lat, current_lng)
            
            # Move time forward
            current_time += timedelta(minutes=np.random.randint(5, 30))
            
            # Check if we should move to next destination
            if current_time > target_arrival:
                itinerary_idx += 1
                
        return events

    def calculate_features(self, events: List[LocationEvent], 
                          profile: TouristProfile) -> List[ModelFeatures]:
        """Calculate model features from location events."""
        features = []
        trip_start = datetime.fromisoformat(profile.trip_start)
        trip_duration = (datetime.fromisoformat(profile.trip_end) - trip_start).days
        
        sex_encoding = {'M': 0, 'F': 1, 'Other': 2}
        
        for i, event in enumerate(events):
            event_time = datetime.fromisoformat(event.timestamp)
            
            # Time of day bucket
            hour = event_time.hour
            if 6 <= hour < 12:
                time_bucket = 'morning'
            elif 12 <= hour < 18:
                time_bucket = 'afternoon'
            elif 18 <= hour < 22:
                time_bucket = 'evening'
            else:
                time_bucket = 'night'
                
            # Distance from itinerary (find closest planned location)
            min_distance = float('inf')
            for waypoint in profile.itinerary:
                dist = self._haversine_distance(
                    event.latitude, event.longitude,
                    waypoint["lat"], waypoint["lng"]
                )
                min_distance = min(min_distance, dist)
                
            # Time since last fix
            time_since_last = 0.0
            if i > 0:
                last_time = datetime.fromisoformat(events[i-1].timestamp)
                time_since_last = (event_time - last_time).total_seconds()
                
            # Average speed last 15 minutes
            avg_speed = event.speed_m_s
            if i > 0:
                recent_events = [e for e in events[:i+1] 
                               if (event_time - datetime.fromisoformat(e.timestamp)).total_seconds() <= 900]
                if recent_events:
                    avg_speed = np.mean([e.speed_m_s for e in recent_events])
                    
            # Area risk score
            area_risk = self.calculate_area_risk(event.latitude, event.longitude)
            
            # Prior incidents (synthetic)
            prior_incidents = np.random.poisson(0.1)  # Low rate
            
            # Days into trip
            days_into_trip = (event_time - trip_start).days
            
            # Restricted zone (high risk areas)
            is_restricted = area_risk > 0.6
            
            # SOS flag (very rare)
            sos_flag = np.random.random() < 0.001
            
            feature = ModelFeatures(
                tourist_id=profile.tourist_id,
                timestamp=event.timestamp,
                time_of_day_bucket=time_bucket,
                distance_from_itinerary=min_distance,
                time_since_last_fix=time_since_last,
                avg_speed_last_15min=avg_speed,
                area_risk_score=area_risk,
                prior_incidents_count=prior_incidents,
                days_into_trip=days_into_trip,
                is_in_restricted_zone=is_restricted,
                sos_flag=sos_flag,
                age=profile.age,
                sex_encoded=sex_encoding[profile.sex],
                days_trip_duration=trip_duration
            )
            
            features.append(feature)
            
        return features

    def generate_safety_labels(self, features: List[ModelFeatures]) -> List[SafetyLabel]:
        """Generate safety labels based on features."""
        labels = []
        
        for feature in features:
            # Base safety score
            safety_score = 75.0  # Start with neutral-good
            
            # Risk factors that decrease safety
            safety_score -= feature.area_risk_score * 30  # High risk area = -30
            safety_score -= min(feature.distance_from_itinerary / 1000, 20)  # Route deviation
            safety_score -= min(feature.time_since_last_fix / 3600, 25)  # Communication loss
            safety_score -= feature.prior_incidents_count * 10  # Past incidents
            
            # Time of day effect
            if feature.time_of_day_bucket == 'night':
                safety_score -= 15
            elif feature.time_of_day_bucket == 'evening':
                safety_score -= 5
                
            # Age factor
            if feature.age > 60 or feature.age < 25:
                safety_score -= 5
                
            # Activity factors
            if feature.avg_speed_last_15min == 0:  # Inactive
                safety_score -= 10
            elif feature.avg_speed_last_15min > 20:  # Very fast (vehicle)
                safety_score += 5
                
            # Restricted zone penalty
            if feature.is_in_restricted_zone:
                safety_score -= 20
                
            # SOS flag
            if feature.sos_flag:
                safety_score = 0  # Emergency
                
            # Add some noise
            safety_score += np.random.normal(0, 5)
            
            # Clamp to 0-100
            safety_score = int(np.clip(safety_score, 0, 100))
            
            # Determine if incident within 24h (based on very low safety score)
            incident_24h = safety_score < 20 and np.random.random() < 0.1
            
            label = SafetyLabel(
                tourist_id=feature.tourist_id,
                timestamp=feature.timestamp,
                safety_label=safety_score,
                incident_within_24h=incident_24h
            )
            
            labels.append(label)
            
        return labels

    def _haversine_distance(self, lat1: float, lon1: float, 
                           lat2: float, lon2: float) -> float:
        """Calculate haversine distance between two points in meters."""
        R = 6371000  # Earth radius in meters
        
        lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        return R * c

    def generate_dataset(self, num_tourists: int, output_dir: str = "data") -> Dict[str, Any]:
        """Generate complete dataset with specified number of tourists."""
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        all_profiles = []
        all_events = []
        all_features = []
        all_labels = []
        
        print(f"Generating data for {num_tourists} tourists...")
        
        for i in range(num_tourists):
            if i % 100 == 0:
                print(f"Progress: {i}/{num_tourists}")
                
            # Generate tourist profile
            profile = self.generate_tourist_profile()
            all_profiles.append(profile)
            
            # Generate location trajectory
            events = self.generate_location_trajectory(profile)
            all_events.extend(events)
            
            # Calculate features
            features = self.calculate_features(events, profile)
            all_features.extend(features)
            
            # Generate labels
            labels = self.generate_safety_labels(features)
            all_labels.extend(labels)
            
        # Convert to DataFrames for easy manipulation
        profiles_df = pd.DataFrame([asdict(p) for p in all_profiles])
        events_df = pd.DataFrame([asdict(e) for e in all_events])
        features_df = pd.DataFrame([asdict(f) for f in all_features])
        labels_df = pd.DataFrame([asdict(l) for l in all_labels])
        
        # Merge features and labels
        training_data = features_df.merge(labels_df, on=['tourist_id', 'timestamp'])
        
        # Split into train/val/test
        unique_tourists = training_data['tourist_id'].unique()
        np.random.shuffle(unique_tourists)
        
        n_train = int(0.7 * len(unique_tourists))
        n_val = int(0.15 * len(unique_tourists))
        
        train_tourists = unique_tourists[:n_train]
        val_tourists = unique_tourists[n_train:n_train + n_val]
        test_tourists = unique_tourists[n_train + n_val:]
        
        train_data = training_data[training_data['tourist_id'].isin(train_tourists)]
        val_data = training_data[training_data['tourist_id'].isin(val_tourists)]
        test_data = training_data[training_data['tourist_id'].isin(test_tourists)]
        
        # Save datasets
        datasets = {
            'profiles': profiles_df,
            'events': events_df,
            'train': train_data,
            'val': val_data,
            'test': test_data
        }
        
        # Save as JSON Lines and CSV
        for name, df in datasets.items():
            df.to_json(f"{output_dir}/{name}.jsonl", orient='records', lines=True)
            df.to_csv(f"{output_dir}/{name}.csv", index=False)
            
        # Save metadata
        metadata = {
            'generated_at': datetime.now().isoformat(),
            'num_tourists': num_tourists,
            'num_events': len(all_events),
            'num_features': len(all_features),
            'config': self.config,
            'train_size': len(train_data),
            'val_size': len(val_data),
            'test_size': len(test_data)
        }
        
        with open(f"{output_dir}/metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
            
        print(f"\nDataset generation complete!")
        print(f"Total tourists: {num_tourists}")
        print(f"Total events: {len(all_events)}")
        print(f"Train samples: {len(train_data)}")
        print(f"Val samples: {len(val_data)}")
        print(f"Test samples: {len(test_data)}")
        print(f"Files saved to: {output_dir}/")
        
        return metadata

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate tourist safety dataset")
    parser.add_argument("--num-tourists", type=int, default=1000, 
                       help="Number of tourists to generate")
    parser.add_argument("--output-dir", type=str, default="data",
                       help="Output directory for dataset")
    parser.add_argument("--seed", type=int, default=42,
                       help="Random seed for reproducibility")
    
    args = parser.parse_args()
    
    generator = TouristDataGenerator(seed=args.seed)
    metadata = generator.generate_dataset(args.num_tourists, args.output_dir)
    
    print(f"\nDataset metadata saved to: {args.output_dir}/metadata.json")
