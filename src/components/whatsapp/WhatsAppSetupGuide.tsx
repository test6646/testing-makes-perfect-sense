import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ExternalLink, 
  Phone, 
  Settings, 
  Wifi, 
  QrCode, 
  MessageSquare, 
  Shield, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Smartphone,
  Server,
  Database
} from 'lucide-react';

const WhatsAppSetupGuide = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">WhatsApp Integration Setup Guide</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Complete step-by-step guide to set up WhatsApp messaging for your business management system
        </p>
      </div>

      {/* Prerequisites */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <Shield className="h-5 w-5" />
            Prerequisites & Requirements
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            What you need before starting the setup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Device Requirements
              </h4>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  WhatsApp Business App (recommended) or Personal WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Active phone number registered with WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Stable internet connection on your phone
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  QR code scanner capability (built into WhatsApp)
                </li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Server className="h-4 w-4" />
                Backend Infrastructure
              </h4>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Railway backend deployment (already configured)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Supabase database connection (active)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  WhatsApp session management system
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Real-time WebSocket connections
                </li>
              </ul>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> WhatsApp Business is recommended for business use. Personal accounts work but may have message limitations and could be restricted by WhatsApp for business usage.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Step-by-Step Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Step-by-Step Setup Process
          </CardTitle>
          <CardDescription>
            Follow these steps in order to set up your WhatsApp integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Initialize WhatsApp Session</h4>
              <p className="text-sm text-muted-foreground">
                Create a secure connection to WhatsApp servers for your business firm.
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Click "Initialize WhatsApp Session" button</li>
                <li>• System creates a unique session ID for your firm</li>
                <li>• Backend establishes connection to WhatsApp servers</li>
                <li>• Session data is securely stored in your database</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Generate and Scan QR Code</h4>
              <p className="text-sm text-muted-foreground">
                Link your phone's WhatsApp to the web interface using a QR code.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <h5 className="font-medium text-sm mb-2">On the Web Interface:</h5>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Click "Generate QR Code"</li>
                    <li>• Wait for QR code to appear (15-30 seconds)</li>
                    <li>• Keep the browser tab open</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-sm mb-2">On Your Phone:</h5>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• Open WhatsApp on your phone</li>
                    <li>• Tap Menu (⋮) → Linked Devices</li>
                    <li>• Tap "Link a Device"</li>
                    <li>• Scan the QR code from the web</li>
                  </ul>
                </div>
              </div>
              
              <Alert className="mt-3">
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  QR codes expire after 2 minutes. If it expires, click "Generate QR Code" again.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <Separator />

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Confirm Connection</h4>
              <p className="text-sm text-muted-foreground">
                Verify that WhatsApp is successfully connected to your business system.
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• System automatically detects successful connection</li>
                <li>• You'll see "Connection Successful!" message</li>
                <li>• Click "Confirm WhatsApp Connection" to enable features</li>
                <li>• Your WhatsApp session is now active and persistent</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
              4
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Test Integration</h4>
              <p className="text-sm text-muted-foreground">
                Send a test message to verify everything is working correctly.
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Click "Send Test Message"</li>
                <li>• System sends a message to the configured test number</li>
                <li>• Verify the message is delivered successfully</li>
                <li>• Your WhatsApp integration is now ready for use!</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Guide */}
      <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <MessageSquare className="h-5 w-5" />
            How to Use WhatsApp Integration
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            Once set up, your WhatsApp integration will work automatically across the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-green-800 dark:text-green-200">📋 Events & Tasks</h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• Event updates to clients</li>
                <li>• Task assignment notifications</li>
                <li>• Deadline reminders</li>
                <li>• Project milestone alerts</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-green-800 dark:text-green-200">💰 Payments & Finance</h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• Payment reminder messages</li>
                <li>• Invoice generation alerts</li>
                <li>• Payment receipt confirmations</li>
                <li>• Balance due notifications</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-green-800 dark:text-green-200">📊 Reports & Updates</h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• Daily/weekly reports</li>
                <li>• Project status updates</li>
                <li>• Team performance summaries</li>
                <li>• Custom message broadcasts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertTriangle className="h-5 w-5" />
            Troubleshooting Common Issues
          </CardTitle>
          <CardDescription className="text-orange-700 dark:text-orange-300">
            Solutions to common setup and usage problems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-background">
              <h4 className="font-semibold mb-2">QR Code Not Generating</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Check your internet connection</li>
                <li>• Refresh the page and try again</li>
                <li>• Ensure backend services are running (Railway deployment)</li>
                <li>• Wait 30-60 seconds before retrying</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg bg-background">
              <h4 className="font-semibold mb-2">Connection Keeps Dropping</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Keep your phone connected to internet</li>
                <li>• Don't log out of WhatsApp on your phone</li>
                <li>• Avoid using WhatsApp Web on multiple devices</li>
                <li>• Ensure your phone has sufficient battery</li>
              </ul>
            </div>
            
            <div className="p-4 border rounded-lg bg-background">
              <h4 className="font-semibold mb-2">Messages Not Sending</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Verify WhatsApp connection status is "Connected"</li>
                <li>• Check if the recipient's phone number is valid</li>
                <li>• Ensure WhatsApp is still linked on your phone</li>
                <li>• Try sending a test message first</li>
              </ul>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Need Help?</strong> Check the debug information section in the WhatsApp integration page for detailed connection status and logs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Security & Best Practices */}
      <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
            <Shield className="h-5 w-5" />
            Security & Best Practices
          </CardTitle>
          <CardDescription className="text-purple-700 dark:text-purple-300">
            Keep your WhatsApp integration secure and reliable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200">🔒 Security Measures</h4>
              <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                <li>• Use WhatsApp Business for better security</li>
                <li>• Enable two-factor authentication on WhatsApp</li>
                <li>• Keep your phone's WhatsApp updated</li>
                <li>• Don't share session IDs or QR codes</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold text-purple-800 dark:text-purple-200">✅ Best Practices</h4>
              <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                <li>• Test message delivery regularly</li>
                <li>• Monitor connection status daily</li>
                <li>• Keep backup communication methods</li>
                <li>• Respect WhatsApp's usage policies</li>
              </ul>
            </div>
          </div>
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Data Protection:</strong> All WhatsApp sessions are encrypted and stored securely. Your message data never leaves your infrastructure.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="text-center">
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-2">Ready to Set Up WhatsApp?</h3>
          <p className="text-muted-foreground mb-4">
            Head to the WhatsApp Integration page to start the setup process
          </p>
          <Button size="lg" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Go to WhatsApp Integration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppSetupGuide;