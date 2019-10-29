import { Router } from 'express';

import multer from 'multer';
import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import FileController from './app/controllers/FileController';
import AppointmentController from './app/controllers/AppointmentController';
import ProviderController from './app/controllers/ProviderController';
import NotificationController from './app/controllers/NotificationController';
import AvailableController from './app/controllers/AvailableController';
import authMiddleware from './app/middlewares/auth';
import multerConfig from './config/multer';

const routes = new Router();
const upload = multer(multerConfig);
routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);
routes.use(authMiddleware);
routes.put('/users', UserController.update);
routes.post('/files', upload.single('file'), FileController.store);
routes.post('/appointments', AppointmentController.store);
routes.get('/appointments', AppointmentController.index);
routes.get('/providers', ProviderController.index);
routes.get('/notifications', NotificationController.index);
routes.get('/providers/:providerId/available', AvailableController.index);
routes.put('/notifications/:id', NotificationController.update);
routes.delete('/appointments/:id', AppointmentController.delete);
export default routes;
