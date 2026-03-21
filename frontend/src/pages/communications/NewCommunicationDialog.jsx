/**
 * NewCommunicationDialog — Create / send a communication
 */


import { COMMUNICATION_TYPES, PRIORITY_LEVELS } from './communicationsConstants';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

const NewCommunicationDialog = ({ open, onClose, communication, setCommunication, onSubmit }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>مراسلة جديدة</DialogTitle>
    <DialogContent>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>نوع المراسلة</InputLabel>
            <Select
              value={communication.type}
              onChange={e => setCommunication({ ...communication, type: e.target.value })}
              label="نوع المراسلة"
            >
              {Object.entries(COMMUNICATION_TYPES).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>الأولوية</InputLabel>
            <Select
              value={communication.priority}
              onChange={e => setCommunication({ ...communication, priority: e.target.value })}
              label="الأولوية"
            >
              {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="الموضوع"
            value={communication.subject}
            onChange={e => setCommunication({ ...communication, subject: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="اسم المستلم"
            value={communication.recipientName}
            onChange={e => setCommunication({ ...communication, recipientName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="البريد الإلكتروني / رقم الهاتف"
            value={communication.recipientContact}
            onChange={e => setCommunication({ ...communication, recipientContact: e.target.value })}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="المحتوى"
            multiline
            rows={6}
            value={communication.content}
            onChange={e => setCommunication({ ...communication, content: e.target.value })}
          />
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>إلغاء</Button>
      <Button onClick={onSubmit} variant="contained" startIcon={<SendIcon />}>
        إرسال
      </Button>
    </DialogActions>
  </Dialog>
);

export default NewCommunicationDialog;
