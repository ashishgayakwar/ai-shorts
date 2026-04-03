export interface ClarifyingQuestion {
  number: string;
  text: string;
}

export interface ActionPoint {
  number: string;
  priority: string;
  title: string;
  body: string;
}

export interface ResultStat {
  label: string;
  value: string;
}

export interface AnswerRoute {
  tabLabel: string;
  clarifyingQuestions: ClarifyingQuestion[];
  hook: string;
  situation: string;
  complication: string;
  action: ActionPoint[];
  resultStats: ResultStat[];
  resultBody: string;
  insight: string;
  speakTime: string;
}

export interface InterviewAnswer {
  questionType: string;
  routes: AnswerRoute[];
}

export interface QuestionInput {
  question: string;
}
