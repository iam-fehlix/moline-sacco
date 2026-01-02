const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.APP_EMAIL,
        pass: process.env.APP_PASSWORD,
    },
});

const sendApprovalEmail = () => {
    const mailOptions = {
        from: 'aloise148@gmail.com',
        to: "vancedg352@gmail.com",
        subject: 'Approval Notification',
        text: 'Your account has been approved.',
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending approval email:', error);
        } else {
            console.log('Approval email sent:', info.response);
        }
    });
};

const sendDisapprovalEmail = (email) => {
    const mailOptions = {
        from: 'aloise148@gmail.com',
        to: email,
        subject: 'Disapproval Notification',
        text: 'Your account has been disapproved.',
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending disapproval email:', error);
        } else {
            console.log('Disapproval email sent:', info.response);
        }
    });
};

const sendWelcomeEmail = (email, firstName) => {
    const mailOptions = {
        from: process.env.APP_EMAIL,
        to: email,
        subject: 'Welcome to Vuka SACCO - Next Steps',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Hello ${firstName},</h2>
                <p>Congratulations! You have successfully signed up as a shareholder in <strong>Vuka Matatu SACCO</strong>.</p>
                <p>To unlock full access to our services (loan applications, matatu management, etc.), please complete the following:</p>
                <ul>
                    <li><strong>Log in</strong> to your account using your email and password.</li>
                    <li><strong>Pay your Shareholder Capital of KES 15,000</strong> through MPESA.</li>
                </ul>
                <p>Once your payment is received, you will have full access to all system functionalities.</p>
                <p>Welcome aboard and thank you for choosing Vuka SACCO. Together, we drive success!</p>
                <br/>
                <p>Kind regards,<br/>The Vuka SACCO Team</p>
            </div>
        `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending welcome email:', error);
        } else {
            console.log('Welcome email sent:', info.response);
        }
    });
};

const shareholderCapitalPaymentEmail = (email, firstName) => {
    const mailOptions = {
        from: process.env.APP_EMAIL,
        to: email,
        subject: 'Shareholder Capital Payment Successful - Vuka SACCO',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Hello ${firstName},</h2>
                <p>Congratulations! 🎉 We have successfully received your shareholder capital payment.</p>
                <p>You now have full access to Vuka SACCO's system features including:</p>
                <ul>
                    <li>Register and manage your matatus</li>
                    <li>Apply for normal and emergency loans</li>
                    <li>Track your payments, savings, and insurance contributions</li>
                    <li>Generate financial and vehicle reports easily</li>
                </ul>
                <p><strong>Next Step:</strong> Log into your account, register your matatu, and start enjoying our services!</p>
                <br/>
                <p>Welcome again to the Vuka SACCO family!</p>
                <br/>
                <p>Kind regards,<br/>The Vuka SACCO Team</p>
            </div>
        `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending shareholder payment email:', error);
        } else {
            console.log('Shareholder payment email sent:', info.response);
        }
    });
};

module.exports = { sendApprovalEmail, sendDisapprovalEmail, sendWelcomeEmail, shareholderCapitalPaymentEmail };
