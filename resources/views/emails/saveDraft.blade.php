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
            background: linear-gradient(135deg, #6c757d, #495057);
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
            color: #495057;
            font-weight: bold;
        }

        .draft-details {
            background-color: #f8f9fa;
            border-left: 4px solid #6c757d;
            padding: 15px;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }

        .draft-details:hover {
            background-color: #f1f3f5;
        }

        a {
            color: #495057;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        a:hover {
            color: #343a40;
            text-decoration: underline;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <h1>Draft Saved</h1>
            </div>
            <a href="{{ url('/home?tab=quotations&ref=' . $draftType) }}" class="header-button">Review Draft</a>
        </div>
        <div class="content">
            <p>Hello <span class="highlight">{{ $firstName }}</span>,</p>
            <p>Quotation for <strong>{{ $institutionName ?? $name }}</strong> amount<strong> KES
                    {{ $totalCost }}</strong> RefNo {{ $draftType }} draft has been successfully saved.</p>
            <div class="draft-details">
                <p><strong>Status:</strong> Draft</p>
                <p><strong>Next Steps:</strong> Return to completion and submission when ready</p>
                <p><strong>Auto-Delete:</strong> Unapproved drafts expire after 30 days</p>
            </div>
            <p>You can resume editing anytime via the link above. Progress is automatically saved.</p>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} Wof Tafaria. All rights reserved.</p>
        </div>
    </div>
</body>

</html>