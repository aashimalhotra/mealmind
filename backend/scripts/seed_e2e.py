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
    db_path = os.path.join(backend_dir, 'data', 'mealmind.db')
    
    # Connect to SQLite database
    engine = create_engine(f'sqlite:///{db_path}')
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Idempotent check: only seed if Recipe count <= 10
        recipe_count = session.query(Recipe).count()
        if recipe_count > 10:
            print(f"Found {recipe_count} recipes (more than 10), skipping seed.")
            return
        
        print(f"Found {recipe_count} recipes, seeding test data...")
        
        # Seed 8 Indian-inspired recipes
        recipes_data = [
            {
                'id': 'e2e-recipe-1',
                'display_name': 'Tandoori Chicken',
                'authentic_name': 'तंदूरी चिकन',
                'description': 'Classic Indian grilled chicken marinated in spiced yogurt.',
                'cuisine': 'Indian',
                'ingredients': json.dumps({'chicken': '500g', 'yogurt': '1 cup', 'tandoori masala': '2 tbsp', 'lemon juice': '1 tbsp'}),
                'prep_steps': json.dumps({'1': 'Mix yogurt, tandoori masala, lemon juice, salt.', '2': 'Marinate chicken for 2+ hours.', '3': 'Grill at 200C for 25 mins.'}),
                'serving_instructions': json.dumps({'note': 'Serve with mint chutney and naan.'}),
                'calories_per_serving': 320,
                'protein_g': 35.0,
                'carbs_g': 5.0,
                'fat_g': 18.0,
                'tags': json.dumps({'category': 'main', 'diet': 'non-vegetarian'}),
                'is_batch_prep': False,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-2',
                'display_name': 'Dal Tadka',
                'authentic_name': 'दाल तड़का',
                'description': 'Yellow lentil soup tempered with spices and ghee.',
                'cuisine': 'Indian',
                'ingredients': json.dumps({'toor dal': '1 cup', 'onion': '1 medium', 'tomato': '1 medium', 'ghee': '1 tbsp'}),
                'prep_steps': json.dumps({'1': 'Boil dal until soft.', '2': 'Temper with onions, tomatoes, spices in ghee.', '3': 'Mix dal and temper, simmer 5 mins.'}),
                'serving_instructions': json.dumps({'note': 'Serve with rice or roti.'}),
                'calories_per_serving': 180,
                'protein_g': 9.0,
                'carbs_g': 28.0,
                'fat_g': 7.0,
                'tags': json.dumps({'category': 'main', 'diet': 'vegetarian'}),
                'is_batch_prep': True,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-3',
                'display_name': 'Palak Paneer',
                'authentic_name': 'पालक पनीर',
                'description': 'Cottage cheese cubes in spiced spinach gravy.',
                'cuisine': 'Indian',
                'ingredients': json.dumps({'spinach': '500g', 'paneer': '200g', 'cream': '2 tbsp', 'spices': 'to taste'}),
                'prep_steps': json.dumps({'1': 'Blanch spinach, blend to puree.', '2': 'Fry paneer cubes until golden.', '3': 'Cook puree with spices, add paneer and cream.'}),
                'serving_instructions': json.dumps({'note': 'Serve with naan or paratha.'}),
                'calories_per_serving': 250,
                'protein_g': 14.0,
                'carbs_g': 8.0,
                'fat_g': 19.0,
                'tags': json.dumps({'category': 'main', 'diet': 'vegetarian'}),
                'is_batch_prep': False,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-4',
                'display_name': 'Chicken Biryani',
                'authentic_name': 'चिकन बिरयानी',
                'description': 'Fragrant rice dish layered with spiced chicken and herbs.',
                'cuisine': 'Indian',
                'ingredients': json.dumps({'basmati rice': '2 cups', 'chicken': '500g', 'yogurt': '1/2 cup', 'biryani masala': '2 tbsp'}),
                'prep_steps': json.dumps({'1': 'Marinate chicken in yogurt and spices for 1 hour.', '2': 'Par-boil rice with whole spices.', '3': 'Layer rice and chicken, dum cook for 20 mins.'}),
                'serving_instructions': json.dumps({'note': 'Serve with raita and salad.'}),
                'calories_per_serving': 450,
                'protein_g': 28.0,
                'carbs_g': 55.0,
                'fat_g': 15.0,
                'tags': json.dumps({'category': 'main', 'diet': 'non-vegetarian'}),
                'is_batch_prep': True,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-5',
                'display_name': 'Chana Masala',
                'authentic_name': 'छोले मसाला',
                'description': 'Chickpea curry in tangy tomato-onion gravy.',
                'cuisine': 'Indian',
                'ingredients': json.dumps({'chickpeas': '1 cup (soaked)', 'onion': '2 medium', 'tomato': '2 medium', 'chana masala': '2 tbsp'}),
                'prep_steps': json.dumps({'1': 'Boil chickpeas until tender.', '2': 'Cook onions, tomatoes, spices to make gravy.', '3': 'Add chickpeas, simmer 10 mins.'}),
                'serving_instructions': json.dumps({'note': 'Serve with bhature or rice.'}),
                'calories_per_serving': 220,
                'protein_g': 10.0,
                'carbs_g': 35.0,
                'fat_g': 6.0,
                'tags': json.dumps({'category': 'main', 'diet': 'vegan'}),
                'is_batch_prep': True,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-6',
                'display_name': 'Aloo Gobi',
                'authentic_name': 'आलू गोभी',
                'description': 'Dry curry of potatoes and cauliflower with spices.',
                'cuisine': 'Indian',
                'ingredients': json.dumps({'potatoes': '2 medium', 'cauliflower': '1 small', 'turmeric': '1 tsp', 'cumin': '1 tsp'}),
                'prep_steps': json.dumps({'1': 'Dice potatoes and cauliflower.', '2': 'Temper cumin, turmeric, add vegetables.', '3': 'Cover and cook until tender.'}),
                'serving_instructions': json.dumps({'note': 'Serve with roti or dal.'}),
                'calories_per_serving': 160,
                'protein_g': 4.0,
                'carbs_g': 32.0,
                'fat_g': 3.0,
                'tags': json.dumps({'category': 'side', 'diet': 'vegan'}),
                'is_batch_prep': False,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-7',
                'display_name': 'Naan',
                'authentic_name': 'नान',
                'description': 'Leavened flatbread baked in tandoor or oven.',
                'cuisine': 'Indian',
                'ingredients': json.dumps({'flour': '2 cups', 'yeast': '1 tsp', 'yogurt': '2 tbsp', 'ghee': '1 tbsp'}),
                'prep_steps': json.dumps({'1': 'Knead dough, let rise for 1 hour.', '2': 'Roll into oval shapes.', '3': 'Bake at 230C for 5-7 mins.'}),
                'serving_instructions': json.dumps({'note': 'Brush with ghee before serving.'}),
                'calories_per_serving': 180,
                'protein_g': 5.0,
                'carbs_g': 32.0,
                'fat_g': 4.0,
                'tags': json.dumps({'category': 'side', 'diet': 'vegetarian'}),
                'is_batch_prep': False,
                'is_favorite': False
            },
            {
                'id': 'e2e-recipe-8',
                'display_name': 'Gulab Jamun',
                'authentic_name': 'गुलाब जामुन',
                'description': 'Deep-fried milk solids soaked in sugar syrup.',
                'cuisine': 'Indian',
                'ingredients': json.dumps({'khoya': '1 cup', 'flour': '2 tbsp', 'sugar': '1 cup', 'cardamom': '1 tsp'}),
                'prep_steps': json.dumps({'1': 'Knead khoya and flour into dough.', '2': 'Make small balls, deep fry until golden.', '3': 'Soak in warm sugar syrup for 30 mins.'}),
                'serving_instructions': json.dumps({'note': 'Serve warm or cold.'}),
                'calories_per_serving': 150,
                'protein_g': 2.0,
                'carbs_g': 28.0,
                'fat_g': 5.0,
                'tags': json.dumps({'category': 'dessert', 'diet': 'vegetarian'}),
                'is_batch_prep': True,
                'is_favorite': False
            }
        ]
        
        for data in recipes_data:
            recipe = Recipe(**data)
            session.add(recipe)
        print(f"Added {len(recipes_data)} recipes.")
        
        # Create test household if not exists (required for MealPlan FK)
        household = session.query(Household).filter_by(id='e2e-household-1').first()
        if not household:
            household = Household(
                id='e2e-household-1',
                name='E2E Test Household',
                prep_days=json.dumps(['Monday']),
                dineout_days=json.dumps(['Sunday']),
                cuisine_pref='Indian'
            )
            session.add(household)
            print("Added test household.")
        
        # Create test meal plan
        meal_plan = MealPlan(
            id='e2e-plan-1',
            household_id='e2e-household-1',
            week_start=date(2026, 5, 4),
            status='approved',
            plan_data=json.dumps({
                'monday': 'e2e-recipe-1',
                'tuesday': 'e2e-recipe-2',
                'wednesday': 'e2e-recipe-3',
                'thursday': 'e2e-recipe-4'
            }),
            grocery_list=json.dumps({
                'chicken': '1kg',
                'lentils': '200g',
                'spinach': '500g',
                'paneer': '200g'
            })
        )
        session.add(meal_plan)
        print("Added test meal plan.")
        
        session.commit()
        print("Seed completed successfully.")
        
    except Exception as e:
        session.rollback()
        print(f"Error during seed: {e}")
        sys.exit(1)
    finally:
        session.close()

if __name__ == '__main__':
    main()
