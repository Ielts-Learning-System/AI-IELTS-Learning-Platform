const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    channel: {
      type: String,
      required: true,
      enum: ['in-app', 'email', 'push'],
    },
    subject: { type: String, default: '' },
    body: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/**
 * Render a template body by replacing {{variable}} placeholders.
 */
notificationTemplateSchema.methods.render = function (variables = {}) {
  let rendered = this.body;
  let renderedSubject = this.subject;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(placeholder, value);
    renderedSubject = renderedSubject.replace(placeholder, value);
  }

  return { subject: renderedSubject, body: rendered };
};

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
