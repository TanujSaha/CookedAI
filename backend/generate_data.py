import pandas as pd
import numpy as np
import os

# Create a folder called 'data' to store our CSV if it doesn't exist
os.makedirs('data', exist_ok=True)

def generate_synthetic_data(num_samples=1500):
    print("Generating synthetic student data...")
    
    # Set a random seed so we get the same random numbers every time we run this
    np.random.seed(42) 
    
    # 1. Generate random features (The 'X')
    # Randomly pick sleep hours between 0 and 12 for 1500 fictional students
    sleep_hours = np.random.randint(0, 13, num_samples)
    screen_time = np.random.randint(0, 17, num_samples)
    attendance = np.random.randint(20, 101, num_samples) # Attendance from 20% to 100%
    assignments = np.random.randint(0, 16, num_samples)
    
    # 2. Calculate a realistic base score
    # We use numpy's 'where' function. It reads like an if/else statement.
    sleep_penalty = np.where(sleep_hours < 8, (8 - sleep_hours) * 5, 0)
    screen_penalty = np.where(screen_time > 4, (screen_time - 4) * 4, 0)
    attendance_penalty = np.where(attendance < 75, (75 - attendance) * 0.8, 0)
    assignments_penalty = assignments * 6
    
    base_score = sleep_penalty + screen_penalty + attendance_penalty + assignments_penalty
    
    # 3. Add Random Noise! 
    # This simulates the unpredictable nature of real life.
    # We add a random number between roughly -10 and +10 to every score.
    noise = np.random.normal(0, 10, num_samples) 
    final_score = base_score + noise
    
    # 4. Clean the Target (The 'y')
    # No one can be less than 0% or more than 100% cooked. 
    # np.clip forces all numbers to stay within 0 and 100.
    final_score = np.clip(np.round(final_score), 0, 100)
    
    # 5. Combine into a Pandas DataFrame (like a virtual Excel sheet)
    df = pd.DataFrame({
        'sleep_hours': sleep_hours,
        'screen_time': screen_time,
        'attendance': attendance,
        'assignments': assignments,
        'cooked_score': final_score
    })
    
    # 6. Save it!
    df.to_csv('data/cooked_dataset.csv', index=False)
    print(f"✅ Successfully saved {num_samples} rows to data/cooked_dataset.csv")
    
    return df

if __name__ == "__main__":
    dataset = generate_synthetic_data(1500)
    print("\nHere is a sneak peek at your new dataset:")
    # .head() prints just the first 5 rows
    print(dataset.head())