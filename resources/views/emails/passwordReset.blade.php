<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Arial', sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
            color: #333;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .header {
            background: linear-gradient(135deg, #6e8efb, #a777e3);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }

        .content {
            padding: 30px;
        }

        h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
        }

        p {
            line-height: 1.6;
            margin-bottom: 20px;
        }

        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #000000;
            color: white !important;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }

        .footer {
            text-align: center;
            padding: 20px;
            background-color: #f9f9f9;
            color: #777;
            font-size: 12px;
        }

        .highlight {
            color: #a777e3;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hello <span class="highlight">{{ $firstName }}</span>,</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>

            <a href="{{ $url }}" class="button">Reset Password</a>

            <p>Or copy the below link:</p>

            <p>{{ $url }}</p>

            <p>If you didn't request this, please ignore this email or contact support if you have questions.</p>
            <p>This link will expire in 24 hours for your security.</p>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} Wof Tafaria. All rights reserved.</p>
        </div>
    </div>
</body>

</html>