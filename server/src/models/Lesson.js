import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['INTERACTIVE', 'THEORY', 'MASTERY'], 
    required: true 
  },
  language: { type: String, default: 'German' },
  difficulty: { 
    type: String, 
    enum: ['Apprentice', 'Explorer', 'Master', 'Sage'], 
    default: 'Apprentice' 
  },
  order: { type: Number, required: true },
  image: { type: String }
});

const Lesson = mongoose.model('Lesson', LessonSchema);
export default Lesson;
