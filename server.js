// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
// Create an Express app
const app = express();
// Middleware
app.use(cors());
app.use(express.json());  // To parse JSON requests

// MongoDB connection
mongoose.connect('mongodb+srv://jobseek:nA5X5O0D5RUYMjpM@cluster0.98tbj.mongodb.net/signup?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.log("Error connecting to MongoDB", err));

// Job Schema
const jobSchema = new mongoose.Schema({
  jobName: String,
  companyName: String,
  place: String,
  jobType: String,
  salary: String,
  studyRequirements: String,
  jobPoster: {
    name: String,
    contactEmail: String,
    contactPhone: String
  }
});

// Job Model
const Job = mongoose.model('Job', jobSchema);
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  degree: String,
  position: String,
  workExperience: String,
  address: String,
  bio: String,
  jobCount: Number,
  jobPreference: [String],
  profilePic: String,
  notifications: [
    {
      applicantName: String,
      applicantEmail: String,
      applicantPhone: String,
      jobId: mongoose.Schema.Types.ObjectId,
      jobName: String,
      date: { type: Date, default: Date.now },
      decision: { type: String, enum: ["accepted", "rejected", null], default: null }, // add decision field
    }
  ],
  messages: [
    {
      jobName: String,
      sender: String,
      decision: String,
      date: { type: Date, default: Date.now }
    }
  ] 
});
userSchema.index({ email: 1 });


const User = mongoose.model('User', userSchema);

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, `${uniqueSuffix}`);
  },
});

const upload = multer({ storage });

const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  name: String,
  email: String,
  phone: String
});

const Application = mongoose.model('Application', applicationSchema);
app.post('/api/jobs/:jobId/apply', async (req, res) => {
  const { jobId } = req.params;
  const { name, email, phone } = req.body;

  try {
    // Find the job by its ID
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Find the job poster using contactEmail from job's jobPoster field
    const jobPoster = await User.findOne({ email: job.jobPoster.contactEmail });
    if (!jobPoster) {
      return res.status(404).json({ error: 'Job poster not found' });
    }

    // Create a notification object
    const notification = {
      applicantName: name,
      applicantEmail: email,
      applicantPhone: phone,
      jobId,
      jobName: job.jobName,
      date: new Date(),
    };

    // Add the notification to the job poster's notifications array
    jobPoster.notifications.push(notification);
    await jobPoster.save();

    // Create a new application record
    const newApplication = new Application({
      jobId,
      name,
      email,
      phone,
    });

    // Save the application to the database
    await newApplication.save();

    res.status(200).json({ message: 'Application submitted and notification sent!' });
  } catch (error) {
    console.error("Error applying for the job:", error);
    res.status(500).json({ error: 'Error submitting application. Please try again.' });
  }
});

// server.js or a relevant route file
app.get('/api/messages/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const user = await User.findOne({ name: username });
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log(user.messages);
    res.json({ messages: user.messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error" });
  }
});
app.get('/api/notifications/:username', async (req, res) => {
  const { username } = req.params;
  
  try {
    const user = await User.findOne({ name: username }).populate('notifications');
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ notifications: user.notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// server.js or a relevant route file
app.post('/api/notifications/:notificationId/decision', async (req, res) => {
  const { notificationId } = req.params;
  const { decision } = req.body;

  try {
    // Find the user who owns the notification
    const user = await User.findOne({ 'notifications._id': notificationId });
    if (!user) return res.status(404).json({ message: "Notification not found" });

    const notification = user.notifications.id(notificationId);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    // Update decision field in the notification
    notification.decision = decision;

    // Find the applicant by email
    const applicant = await User.findOne({ email: notification.applicantEmail });
    if (applicant) {
      // Add a message to the applicant’s messages array
      applicant.messages.push({
        jobName: notification.jobName,
        sender: user.name,
        decision: decision,
        date: new Date()
      });
      await applicant.save();
    }

    // Save the updated job poster's user
    await user.save();

    res.json({ message: `Application ${decision} successfully, and applicant notified.` });
  } catch (error) {
    console.error("Error processing decision:", error);
    res.status(500).json({ message: "Server error processing decision" });
  }
});

// Sign-up route
app.post('/signup', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send({ message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).send({ message: 'Error creating user', error });
  }
});
app.post('/api/jobs/:jobId/apply', async (req, res) => {
  const { jobId } = req.params;
  const { name, email, phone } = req.body;

  try {
    // Create a new application record
    const newApplication = new Application({
      jobId,
      name,
      email,
      phone,
    });

    // Save the application to the database
    await newApplication.save();

    // Send success response
    res.status(200).send({ message: 'Application submitted successfully!' });
  } catch (error) {
    console.error('Error saving application:', error);
    res.status(500).send({ message: 'Error applying for the job. Please try again.' });
  }
});
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching job details' });
  }
});
app.post('/api/jobs', async (req, res) => {
  try {
    const { jobName, companyName, place, jobType, salary, studyRequirements, name, contactEmail, contactPhone } = req.body;

    // Create a new Job document
    const newJob = new Job({
      jobName,
      companyName,
      place,
      jobType,
      salary,
      studyRequirements,
      jobPoster: {
        name,
        contactEmail,
        contactPhone
      }
    });

    // Save the job to the database
    const savedJob = await newJob.save();

    // Send back the saved job as a response
    res.status(201).json(savedJob);
  } catch (error) {
    res.status(500).json({ error: 'Error saving job' });
  }
});
// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });
    if (user) {
      res.status(200).json({ _id: user._id, position: user.position, email: user.email, name: user.name });
    } else {
      res.status(400).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get user profile
app.get('/user/profile', async (req, res) => {
  const email = req.query.email;
  try {
    const user = await User.findOne({ email });
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

app.post('/user/update-profile', upload.single('profilePic'), async (req, res) => {
  const { email, bio, jobPreference, jobCount } = req.body;
  const profilePicPath = req.file ? `/images/${req.file.filename}` : null;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        bio,
        jobPreference: JSON.parse(jobPreference),
        jobCount,
        ...(profilePicPath && { profilePic: profilePicPath }),
      },
      { new: true }
    );

    if (updatedUser) {
      res.status(200).json({ success: true, message: 'Profile updated successfully', user: updatedUser });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Error updating profile', error });
  }
});
// Example Express.js route to fetch the user's profile by email
// Sample Express Route to get user profile by email
app.get('/api/users/profile', async (req, res) => {
  const email = req.query.email;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Routes
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find();
    res.json(jobs);
  } catch (err) {
    res.status(500).send("Error retrieving jobs");
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen();