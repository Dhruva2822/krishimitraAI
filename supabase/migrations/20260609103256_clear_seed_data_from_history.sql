/*
# Clear Seed Data from User History Tables

1. Changes
- Remove all pre-seeded data from `crop_diseases` and `soil_reports` tables
- These tables now only contain user-generated records
- `yield_records` and `disease_knowledge` keep their seed data (reference data)

2. Security
- No policy changes needed

3. Important Notes
- This ensures history panels only show reports actually performed by users
- Dashboard disease/soil panels will be empty until user generates records
- Reference data remains intact for disease detection and prediction
*/

DELETE FROM crop_diseases WHERE image_url IS NULL;
DELETE FROM soil_reports WHERE raw_text LIKE 'Soil Test Report%' OR raw_text LIKE 'Soil Analysis%' OR raw_text LIKE 'Wheat Field%';
