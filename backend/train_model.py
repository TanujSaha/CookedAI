import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
import joblib
import os

# Create a models directory
os.makedirs('models', exist_ok=True)

print("1. Loading dataset...")
df = pd.read_csv('data/cooked_dataset.csv')

print("2. Separating Features (X) and Target (y)...")
X = df[['sleep_hours', 'screen_time', 'attendance', 'assignments']]
y = df['cooked_score']

print("3. Splitting into Training and Testing sets (80/20)...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("4. Training the Random Forest AI...")
# n_estimators=100 means we are building a "forest" of 100 decision trees
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

print("5. Evaluating the model...")
predictions = model.predict(X_test)
# MAE tells us how many points off our prediction is on average
mae = mean_absolute_error(y_test, predictions)
print(f"   Model Accuracy: On average, predictions are off by just {mae:.2f} points.")

print("6. Saving the trained model...")
joblib.dump(model, 'models/cooked_model.pkl')
print("✅ Model successfully saved to models/cooked_model.pkl!")