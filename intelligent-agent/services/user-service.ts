// Microservice bootstrap for User Profile module
import express from 'express';
import { UserProfileManager } from '../src/modules/user-profile';

const app = express();
const userProfileManager = new UserProfileManager();

app.use(express.json());

app.post('/user', (req, res) => {
  const { id, name, email } = req.body;
  if (!id || !name || !email) return res.status(400).json({ error: 'Missing fields' });
  userProfileManager.addUser({ id, name, email });
  res.json({ status: 'User added' });
});

app.get('/user/:id', (req, res) => {
  const user = userProfileManager.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

const PORT = process.env.USER_SERVICE_PORT || 4002;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`User Profile Microservice running on port ${PORT}`);
});
