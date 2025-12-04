import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, Instagram, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/query-client';

interface IgAccount {
  id: string;
  igUserId: string;
  igUsername: string;
  tokenExpiresAt: string;
  tokenStatus: 'valid' | 'expiring_soon' | 'expired';
  daysUntilExpiry: number;
  createdAt: string;
}

interface IgAuthUrlResponse {
  authUrl: string;
}

export function AccountConnection() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch Instagram accounts
  const { data: accounts = [], isLoading } = useQuery<IgAccount[]>({
    queryKey: ['/api/ig/accounts'],
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await apiRequest('DELETE', `/api/ig/accounts/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ig/accounts'] });
      toast({
        title: 'Аккаунт отвязан',
        description: 'Instagram аккаунт успешно отключён',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Ошибка отвязки',
        description: error.message || 'Не удалось отвязать аккаунт',
      });
    },
  });

  // Connect Instagram account
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Get OAuth URL from backend
      const response = await fetch('/api/ig/auth/url', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Не удалось получить URL авторизации');
      }

      const data: IgAuthUrlResponse = await response.json();
      
      // Redirect to Facebook OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      setIsConnecting(false);
      toast({
        variant: 'destructive',
        title: 'Ошибка подключения',
        description: error.message || 'Не удалось подключить Instagram аккаунт',
      });
    }
  };

  // Disconnect account
  const handleDisconnect = async (accountId: string, username: string) => {
    if (!confirm(`Отвязать аккаунт @${username}? Все синхронизированные данные будут удалены.`)) {
      return;
    }
    deleteAccountMutation.mutate(accountId);
  };

  // Reconnect (refresh token)
  const handleReconnect = () => {
    handleConnect();
  };

  // Get token status badge
  const getTokenStatusBadge = (account: IgAccount) => {
    if (account.tokenStatus === 'expired') {
      return (
        <Badge variant="destructive" className="gap-1" data-testid={`badge-token-expired-${account.id}`}>
          <AlertCircle className="w-3 h-3" />
          Токен истёк
        </Badge>
      );
    }
    
    if (account.tokenStatus === 'expiring_soon') {
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 dark:text-amber-400" data-testid={`badge-token-expiring-${account.id}`}>
          <AlertTriangle className="w-3 h-3" />
          Истекает через {account.daysUntilExpiry}д
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="gap-1 border-green-600 text-green-700 dark:text-green-400" data-testid={`badge-token-valid-${account.id}`}>
        <Check className="w-3 h-3" />
        Активен ({account.daysUntilExpiry}д)
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card data-testid="card-account-connection-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            Подключение Instagram
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAccount = accounts.length > 0;
  const hasExpiredAccount = accounts.some(acc => acc.tokenStatus === 'expired');
  const hasExpiringSoon = accounts.some(acc => acc.tokenStatus === 'expiring_soon');

  return (
    <Card data-testid="card-account-connection">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="w-5 h-5" />
          Подключение Instagram
        </CardTitle>
        <CardDescription>
          Подключите Instagram Business аккаунт для автоматической синхронизации статистики публикаций
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning alerts */}
        {hasExpiredAccount && (
          <Alert variant="destructive" data-testid="alert-token-expired">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Токен истёк</AlertTitle>
            <AlertDescription>
              Доступ к Instagram API утрачен. Переавторизуйтесь для продолжения синхронизации данных.
            </AlertDescription>
          </Alert>
        )}

        {!hasExpiredAccount && hasExpiringSoon && (
          <Alert data-testid="alert-token-expiring">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Токен скоро истечёт</AlertTitle>
            <AlertDescription>
              Рекомендуем переавторизоваться сейчас, чтобы избежать прерывания синхронизации.
            </AlertDescription>
          </Alert>
        )}

        {/* Connected accounts */}
        {hasAccount && (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 border rounded-md"
                data-testid={`account-card-${account.id}`}
              >
                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5 text-pink-600" />
                  <div>
                    <div className="font-medium" data-testid={`text-username-${account.id}`}>
                      @{account.igUsername}
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`text-user-id-${account.id}`}>
                      ID: {account.igUserId}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getTokenStatusBadge(account)}
                  
                  {account.tokenStatus === 'expired' || account.tokenStatus === 'expiring_soon' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReconnect}
                      disabled={isConnecting}
                      data-testid={`button-reconnect-${account.id}`}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
                      Переавторизовать
                    </Button>
                  ) : null}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDisconnect(account.id, account.igUsername)}
                    disabled={deleteAccountMutation.isPending}
                    data-testid={`button-disconnect-${account.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connect button */}
        {!hasAccount && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Instagram className="w-12 h-12 text-muted-foreground" />
            <div className="text-center space-y-2">
              <div className="font-medium">Аккаунт не подключён</div>
              <div className="text-sm text-muted-foreground max-w-md">
                Подключите Instagram Business аккаунт, чтобы получать реальную статистику публикаций и сравнивать её с AI-прогнозами
              </div>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              data-testid="button-connect-instagram"
            >
              <Instagram className={`w-4 h-4 mr-2 ${isConnecting ? 'animate-spin' : ''}`} />
              Подключить Instagram
            </Button>
          </div>
        )}

        {/* Requirements note */}
        <Alert data-testid="alert-requirements">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Требования</AlertTitle>
          <AlertDescription className="space-y-1 text-sm">
            <div>• Instagram Business аккаунт, привязанный к Facebook Page</div>
            <div>• Права на управление аккаунтом (admin или editor)</div>
            <div>• Токен автоматически обновляется каждые 60 дней</div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
