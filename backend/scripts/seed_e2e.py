import os
import sys
import json
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.models import Recipe, MealPlan, Household

def main():
    # Calculate path to backend directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)

    # For Docker environment, use /app/data/ directly
    if os.path.exists('/app/data'):
        db_path = os.path.join('/app/data', 'mealmind.db')
    else:
        db_path = os.path.join(backend_dir, 'data', 'mealmind.db')

    print(f"Using database at: {db_path}")

    # Connect to SQLite database
    engine = create_engine(f'sqlite:///{db_path}')
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Delete existing e2e data for clean re-seed
        print("Cleaning up existing e2e data...")
        session.query(Recipe).filter(Recipe.id.like('e2e-recipe-%')).delete()
        session.query(MealPlan).filter(MealPlan.id == 'e2e-plan-1').delete()
        session.query(Household).filter(Household.id == 'e2e-household-1').delete()
        session.commit()
        print("Cleanup done.")

        # Seed 8 Indian-inspired recipes with CORRECT formats
        print("Seeding 8 Indian-inspired recipes...")
        recipes_data = [
            {
                'id': 'e2e-recipe-1',
                'display_name': 'Tandoori Chicken',
                'authentic_name': 'तंदूरी चिकन',
                'description': 'Classic Indian grilled chicken marinated in spiced yogurt.',
                'cuisine': 'Indian',
                'ingredients': json.dumps([
                    {'name': 'chicken', 'quantity_1500': 500.0, 'quantity_1800': 600.0, 'unit': 'g'},
                    {'name': 'yogurt', 'quantity_1500': 200.0, 'quantity_1800': 240.0, 'unit': 'g'},
                    {'name': 'tandoori masala', 'quantity_1500': 10.0, 'quantity_1800': 12.0, 'unit': 'g'},
                    {'name': 'lemon juice', 'quantity_1500': 15.0, 'quantity_1800': 18.0, 'unit': 'ml'}
                ]),
                'prep_steps': json.dumps([
                    'Mix yogurt, tandoori masala, lemon juice, salt.',
                    'Marinate chicken for 2+ hours.',
                    'Grill at 200C for 25 mins.'
                ]),
                'serving_instructions': json.dumps([
                    'Serve with mint chutney and naan.'
                ]),
                'calories_per_serving': 320,
                'protein_g': 35.0,
                'carbs_g': 5.0,
                'fat_g': 18.0,
                'tags': json.dumps(['main', 'non-vegetarian']),
                'is_batch_prep': False,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-2',
                'display_name': 'Dal Tadka',
                'authentic_name': 'दाल तड़का',
                'description': 'Yellow lentil soup tempered with spices and ghee.',
                'cuisine': 'Indian',
                'ingredients': json.dumps([
                    {'name': 'toor dal', 'quantity_1500': 100.0, 'quantity_1800': 120.0, 'unit': 'g', 'nutrition_source': 'llm_estimate'},
                    {'name': 'onion', 'quantity_1500': 50.0, 'quantity_1800': 60.0, 'unit': 'g', 'nutrition_source': 'llm_estimate'},
                    {'name': 'tomato', 'quantity_1500': 50.0, 'quantity_1800': 60.0, 'unit': 'g', 'nutrition_source': 'llm_estimate'},
                    {'name': 'ghee', 'quantity_1500': 10.0, 'quantity_1800': 12.0, 'unit': 'g', 'nutrition_source': 'llm_estimate'}
                ]),
                'prep_steps': json.dumps([
                    'Boil dal until soft.',
                    'Temper with onions, tomatoes, spices in ghee.',
                    'Mix dal and temper, simmer 5 mins.'
                ]),
                'serving_instructions': json.dumps([
                    'Serve with rice or roti.'
                ]),
                'calories_per_serving': 180,
                'protein_g': 9.0,
                'carbs_g': 28.0,
                'fat_g': 7.0,
                'tags': json.dumps(['main', 'vegetarian']),
                'is_batch_prep': True,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-3',
                'display_name': 'Palak Paneer',
                'authentic_name': 'पालक पनीर',
                'description': 'Cottage cheese cubes in spiced spinach gravy.',
                'cuisine': 'Indian',
                'ingredients': json.dumps([
                    {'name': 'spinach', 'quantity_1500': 500.0, 'quantity_1800': 600.0, 'unit': 'g'},
                    {'name': 'paneer', 'quantity_1500': 200.0, 'quantity_1800': 240.0, 'unit': 'g'},
                    {'name': 'cream', 'quantity_1500': 30.0, 'quantity_1800': 36.0, 'unit': 'ml'},
                    {'name': 'spices', 'quantity_1500': 10.0, 'quantity_1800': 12.0, 'unit': 'g'}
                ]),
                'prep_steps': json.dumps([
                    'Blanch spinach, blend to puree.',
                    'Fry paneer cubes until golden.',
                    'Cook puree with spices, add paneer and cream.'
                ]),
                'serving_instructions': json.dumps([
                    'Serve with naan or paratha.'
                ]),
                'calories_per_serving': 250,
                'protein_g': 14.0,
                'carbs_g': 8.0,
                'fat_g': 19.0,
                'tags': json.dumps(['main', 'vegetarian']),
                'is_batch_prep': False,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-4',
                'display_name': 'Chicken Biryani',
                'authentic_name': 'चिकन बिरयानी',
                'description': 'Fragrant rice dish layered with spiced chicken and herbs.',
                'cuisine': 'Indian',
                'ingredients': json.dumps([
                    {'name': 'basmati rice', 'quantity_1500': 300.0, 'quantity_1800': 360.0, 'unit': 'g'},
                    {'name': 'chicken', 'quantity_1500': 500.0, 'quantity_1800': 600.0, 'unit': 'g'},
                    {'name': 'yogurt', 'quantity_1500': 100.0, 'quantity_1800': 120.0, 'unit': 'g'},
                    {'name': 'biryani masala', 'quantity_1500': 10.0, 'quantity_1800': 12.0, 'unit': 'g'}
                ]),
                'prep_steps': json.dumps([
                    'Marinate chicken in yogurt and spices for 1 hour.',
                    'Par-boil rice with whole spices.',
                    'Layer rice and chicken, dum cook for 20 mins.'
                ]),
                'serving_instructions': json.dumps([
                    'Serve with raita and salad.'
                ]),
                'calories_per_serving': 450,
                'protein_g': 28.0,
                'carbs_g': 55.0,
                'fat_g': 15.0,
                'tags': json.dumps(['main', 'non-vegetarian', 'batch-prep']),
                'is_batch_prep': True,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-5',
                'display_name': 'Chana Masala',
                'authentic_name': 'छोले मसाला',
                'description': 'Chickpea curry in tangy tomato-onion gravy.',
                'cuisine': 'Indian',
                'ingredients': json.dumps([
                    {'name': 'chickpeas', 'quantity_1500': 150.0, 'quantity_1800': 180.0, 'unit': 'g'},
                    {'name': 'onion', 'quantity_1500': 100.0, 'quantity_1800': 120.0, 'unit': 'g'},
                    {'name': 'tomato', 'quantity_1500': 100.0, 'quantity_1800': 120.0, 'unit': 'g'},
                    {'name': 'chana masala', 'quantity_1500': 10.0, 'quantity_1800': 12.0, 'unit': 'g'}
                ]),
                'prep_steps': json.dumps([
                    'Boil chickpeas until tender.',
                    'Cook onions, tomatoes, spices to make gravy.',
                    'Add chickpeas, simmer 10 mins.'
                ]),
                'serving_instructions': json.dumps([
                    'Serve with bhature or rice.'
                ]),
                'calories_per_serving': 220,
                'protein_g': 10.0,
                'carbs_g': 35.0,
                'fat_g': 6.0,
                'tags': json.dumps(['main', 'vegan', 'batch-prep']),
                'is_batch_prep': True,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-6',
                'display_name': 'Aloo Gobi',
                'authentic_name': 'आलू गोभी',
                'description': 'Dry curry of potatoes and cauliflower with spices.',
                'cuisine': 'Indian',
                'ingredients': json.dumps([
                    {'name': 'potatoes', 'quantity_1500': 200.0, 'quantity_1800': 240.0, 'unit': 'g'},
                    {'name': 'cauliflower', 'quantity_1500': 200.0, 'quantity_1800': 240.0, 'unit': 'g'},
                    {'name': 'turmeric', 'quantity_1500': 5.0, 'quantity_1800': 6.0, 'unit': 'g'},
                    {'name': 'cumin', 'quantity_1500': 5.0, 'quantity_1800': 6.0, 'unit': 'g'}
                ]),
                'prep_steps': json.dumps([
                    'Dice potatoes and cauliflower.',
                    'Temper cumin, turmeric, add vegetables.',
                    'Cover and cook until tender.'
                ]),
                'serving_instructions': json.dumps([
                    'Serve with roti or dal.'
                ]),
                'calories_per_serving': 160,
                'protein_g': 4.0,
                'carbs_g': 32.0,
                'fat_g': 3.0,
                'tags': json.dumps(['side', 'vegan']),
                'is_batch_prep': False,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-7',
                'display_name': 'Naan',
                'authentic_name': 'नान',
                'description': 'Leavened flatbread baked in tandoor or oven.',
                'cuisine': 'Indian',
                'ingredients': json.dumps([
                    {'name': 'flour', 'quantity_1500': 300.0, 'quantity_1800': 360.0, 'unit': 'g'},
                    {'name': 'yeast', 'quantity_1500': 5.0, 'quantity_1800': 6.0, 'unit': 'g'},
                    {'name': 'yogurt', 'quantity_1500': 30.0, 'quantity_1800': 36.0, 'unit': 'g'},
                    {'name': 'ghee', 'quantity_1500': 10.0, 'quantity_1800': 12.0, 'unit': 'g'}
                ]),
                'prep_steps': json.dumps([
                    'Knead dough, let rise for 1 hour.',
                    'Roll into oval shapes.',
                    'Bake at 230C for 5-7 mins.'
                ]),
                'serving_instructions': json.dumps([
                    'Brush with ghee before serving.'
                ]),
                'calories_per_serving': 180,
                'protein_g': 5.0,
                'carbs_g': 32.0,
                'fat_g': 4.0,
                'tags': json.dumps(['side', 'vegetarian']),
                'is_batch_prep': False,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-8',
                'display_name': 'Gulab Jamun',
                'authentic_name': 'गुलाब जामुन',
                'description': 'Deep-fried milk solids soaked in sugar syrup.',
                'cuisine': 'Indian',
                'ingredients': json.dumps([
                    {'name': 'khoya', 'quantity_1500': 200.0, 'quantity_1800': 240.0, 'unit': 'g'},
                    {'name': 'flour', 'quantity_1500': 50.0, 'quantity_1800': 60.0, 'unit': 'g'},
                    {'name': 'sugar', 'quantity_1500': 200.0, 'quantity_1800': 240.0, 'unit': 'g'},
                    {'name': 'cardamom', 'quantity_1500': 2.0, 'quantity_1800': 2.4, 'unit': 'g'}
                ]),
                'prep_steps': json.dumps([
                    'Knead khoya and flour into dough.',
                    'Make small balls, deep fry until golden.',
                    'Soak in warm sugar syrup for 30 mins.'
                ]),
                'serving_instructions': json.dumps([
                    'Serve warm or cold.'
                ]),
                'calories_per_serving': 150,
                'protein_g': 2.0,
                'carbs_g': 28.0,
                'fat_g': 5.0,
                'tags': json.dumps(['dessert', 'vegetarian', 'batch-prep']),
                'is_batch_prep': True,
                'is_favorite': False
            }
        ]

        for data in recipes_data:
            recipe = Recipe(**data)
            session.add(recipe)
        print(f"Added {len(recipes_data)} recipes.")

        # Create test household
        print("Creating test household...")
        household = Household(
            id='e2e-household-1',
            name='E2E Test Household',
            prep_days=json.dumps(['sunday', 'wednesday']),
            dineout_days=json.dumps([]),
            cuisine_pref='Indian'
        )
        session.add(household)
        print("Added test household.")

        # Create test meal plan with plan_data referencing recipes
        print("Creating test meal plan...")
        meal_plan = MealPlan(
            id='e2e-plan-1',
            household_id='e2e-household-1',
            week_start=date(2026, 5, 4),
            status='approved',
            plan_data=json.dumps({
                'monday': {
                    'breakfast': {'recipe_id': 'e2e-recipe-1', 'display_name': 'Tandoori Chicken'},
                    'lunch': {'recipe_id': 'e2e-recipe-2', 'display_name': 'Dal Tadka'},
                    'dinner': {'recipe_id': 'e2e-recipe-3', 'display_name': 'Palak Paneer'}
                },
                'tuesday': {
                    'breakfast': {'recipe_id': 'e2e-recipe-4', 'display_name': 'Chicken Biryani'},
                    'lunch': {'recipe_id': 'e2e-recipe-5', 'display_name': 'Chana Masala'},
                    'dinner': {'recipe_id': 'e2e-recipe-6', 'display_name': 'Aloo Gobi'}
                },
                'wednesday': {
                    'breakfast': {'recipe_id': 'e2e-recipe-7', 'display_name': 'Naan'},
                    'lunch': {'recipe_id': 'e2e-recipe-8', 'display_name': 'Gulab Jamun'},
                    'dinner': {'recipe_id': 'e2e-recipe-1', 'display_name': 'Tandoori Chicken'}
                },
                'thursday': {
                    'breakfast': {'recipe_id': 'e2e-recipe-2', 'display_name': 'Dal Tadka'},
                    'lunch': {'recipe_id': 'e2e-recipe-3', 'display_name': 'Palak Paneer'},
                    'dinner': {'recipe_id': 'e2e-recipe-4', 'display_name': 'Chicken Biryani'}
                }
            }),
            grocery_list=None  # Will be generated on first access
        )
        session.add(meal_plan)
        print("Added test meal plan.")

        session.commit()
        print("Seed completed successfully.")

    except Exception as e:
        session.rollback()
        print(f"Error during seed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        session.close()

if __name__ == '__main__':
    main()
