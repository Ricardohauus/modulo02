import * as Yup from 'yup';

import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

import User from '../models/User';
import File from '../models/File';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });
    // Verifica se atributos passados são válidos
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation Fails' });
    }

    const { provider_id, date } = req.body;

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    // Verifica se o usuário é um prestador de serviço
    if (!isProvider) {
      return res.status(401).json({
        error: 'You can only create appointments with providers',
      });
    }

    // Retorna a hora do agendamento
    const hourStart = startOfHour(parseISO(date));

    // Verifica se o horário do agendamento é antes do horário atual
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });
    // Verifica se a Data está disponivel
    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    // Verifica se quem está agendando não está agendando para si mesmo

    if (provider_id === req.userId) {
      return res
        .status(404)
        .json({ error: "You can't create apppointment for you" });
    }
    // Salva o agendamento
    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    const user = await User.findByPk(req.userId);
    const formattedDate = format(hourStart, "'Dia' dd 'de' MMM', às' H:mm'h'", {
      local: pt,
    });

    // Notifica o prestador de serviço
    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id);
    if (appointment.user_id !== req.user_id) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment.",
      });
    }
    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance.',
      });
    }

    appointment.canceled_at = new Date();
    await appointment.save();

    return res.json(appointment);
  }
}

export default new AppointmentController();
