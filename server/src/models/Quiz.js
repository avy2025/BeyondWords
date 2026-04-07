import mongoose from 'mongoose';

const QuizSchema = new mongoose.Schema({
  lessonId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lesson', 
    required: true,
    unique: true 
  },
  questions: [{
    idiom: { type: String, required: true },
    origin: { type: String, required: true },
    options: [{ type: String }],
    correct: { type: Number, required: true },
    nuance: { type: String, required: true }
  }]
});

const Quiz = mongoose.model('Quiz', QuizSchema);
export default Quiz;
