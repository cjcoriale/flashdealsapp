import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Users, MousePointer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuditLog } from "@shared/schema";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuditModal({ isOpen, onClose }: AuditModalProps) {
  const [isVisible, setIsVisible] = useState(isOpen);

  const { data: auditLogs = [], isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit/logs"],
    enabled: isOpen,
  });

  const { data: auditStats, isLoading: statsLoading } = useQuery<{
    totalUsers: number;
    actionsToday: number;
    errors: number;
  }>({
    queryKey: ["/api/audit/stats"],
    enabled: isOpen,
  });

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className={`slide-up ${isVisible ? 'active' : ''} w-full max-w-6xl h-full max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden`}>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Audit Logs</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6 text-gray-600" />
            </Button>
          </div>

          {/* Audit Statistics */}
          {statsLoading ? (
            <div className="flex justify-center mb-6">
              <LoadingSpinner />
            </div>
          ) : auditStats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="flex items-center">
                  <div className="bg-primary p-3 rounded-xl mr-3">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-xl font-bold text-gray-800">{auditStats.totalUsers}</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-xl">
                <div className="flex items-center">
                  <div className="bg-secondary p-3 rounded-xl mr-3">
                    <MousePointer className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Actions Today</p>
                    <p className="text-xl font-bold text-gray-800">{auditStats.actionsToday}</p>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl">
                <div className="flex items-center">
                  <div className="bg-accent p-3 rounded-xl mr-3">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Errors</p>
                    <p className="text-xl font-bold text-gray-800">{auditStats.errors}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Audit Log Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
            </div>
            <div className="overflow-x-auto">
              {logsLoading ? (
                <div className="flex justify-center p-8">
                  <LoadingSpinner />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  No audit logs found
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.userId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.action}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {log.details}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
