import './App.scss';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
} from "react-router-dom";
import Nav from './components/Navigation/Nav';
import Login from './page/auth/Login';
import Register from './page/auth/Register';
import CandidateHome from './page/candidate/CandidateHome';
import CompanyList from './page/candidate/CompanyList';
import MyRecords from './page/candidate/MyRecords';
import JobList from './page/candidate/JobList';
import JobDetail from './page/candidate/JobDetail';
import MyApplications from './page/candidate/MyApplications';
import MyTests from './page/candidate/MyTests';
import TestTaking from './page/candidate/TestTaking';
import TestResult from './page/candidate/TestResult';
import HrDashboard from './page/hr/HrDashboard';
import MeetingRoom from './page/meeting/MeetingRoom';
import JitsiRoom from './components/JitsiRoom';
import InterviewConfirm from './page/interview/InterviewConfirm';
import InterviewReject from './page/interview/InterviewReject';

function App() {
  return (
    <Router>
      <div className="App">
        {/* <Nav /> */}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Candidate Routes */}
          <Route path="/candidate" element={<CandidateHome />} />
          <Route path="/candidate/jobs" element={<JobList />} />
          <Route path="/candidate/jobs/:id" element={<JobDetail />} />
          <Route path="/candidate/companies" element={<CompanyList />} />
          <Route path="/candidate/my-records" element={<MyRecords />} />
          <Route path="/candidate/my-applications" element={<MyApplications />} />
          <Route path="/candidate/my-tests" element={<MyTests />} />
          <Route path="/candidate/tests/:submissionId" element={<TestTaking />} />
          <Route path="/candidate/test-results/:submissionId" element={<TestResult />} />
          <Route path="/candidate/profile" element={<div>Profile Page</div>} />
          <Route path="/candidate/settings" element={<div>Settings Page</div>} />
          
          {/* Meeting Routes */}
          <Route path="/meeting/:roomName" element={<JitsiRoom />} />
          
          {/* Interview Response Routes (Public - No Auth Required) */}
          <Route path="/interview/confirm" element={<InterviewConfirm />} />
          <Route path="/interview/reject" element={<InterviewReject />} />
          
          {/* Other Routes */}
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
          <Route path="/hr" element={<HrDashboard />} />
          <Route path="/hr/jobs" element={<HrDashboard />} />
          <Route path="/hr/tests" element={<HrDashboard />} />
          <Route path="/hr/question-banks" element={<HrDashboard />} />
          <Route path="/hr/test-submissions" element={<HrDashboard />} />
          <Route path="/hr/interview-rounds" element={<HrDashboard />} />
          <Route path="/hr/meetings" element={<HrDashboard />} />
          <Route path="/hr/candidates" element={<HrDashboard />} />
          <Route path="/hr/documents" element={<HrDashboard />} />
          <Route path="/hr/company-profile" element={<HrDashboard />} />
          <Route path="/" element={<Login />} />
          <Route path="*" element={<div>Access Denied</div>} /> 
        </Routes>
      </div>
    </Router>
  );
}

export default App;
