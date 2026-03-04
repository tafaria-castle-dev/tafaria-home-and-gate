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
            background: linear-gradient(135deg, #FFA500, #FF8C00);
            color: white;
            padding: 20px;
            text-align: center;
            position: relative;
        }

        .header-content {
            margin-bottom: 15px;
        }

        .header-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #000000;
            color: white !important;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin-top: 10px;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .header-button:hover {
            background-color: #333333;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }

        .header-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .content {
            padding: 30px;
        }

        h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        p {
            line-height: 1.6;
            margin-bottom: 20px;
        }

        .footer {
            text-align: center;
            padding: 20px;
            background-color: #f9f9f9;
            color: #777;
            font-size: 12px;
        }

        .highlight {
            color: #FF8C00;
            font-weight: bold;
        }

        .quotation-details {
            background-color: #f8f9fa;
            border-left: 4px solid #FFA500;
            padding: 15px;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }

        .quotation-details:hover {
            background-color: #f1f3f5;
        }

        a {
            color: #FF8C00;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        a:hover {
            color: #FF6B00;
            text-decoration: underline;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>New Quotation Requires Approval</h1>
            </div>
        </div>
        <div class="content">
            <p>Hello <span class="highlight">{{ $firstName }}</span>,</p>
            <p>A new quotation has been submitted and requires your review.</p>
            <div class="quotation-details">
                <p>Please review the details for <strong>{{ $institutionName ?? $name }}</strong> amount<strong> KES
                        {{ $totalCost }}</strong>.</p>
                <a href="{{ url('/home?tab=quotations&ref=' . $url) }}" class="header-button">Review Quotation</a>
            </div>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} Wof Tafaria. All rights reserved.</p>
        </div>
    </div>
</body>

</html>