'use client';

import { useState, useEffect, useCallback } from 'react';
import { IMicrophoneAudioTrack } from 'agora-rtc-react';
import { Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MicrophoneSelectorProps {
  localMicrophoneTrack: IMicrophoneAudioTrack | null;
}

interface MicrophoneDevice {
  deviceId: string;
  label: string;
}

export function MicrophoneSelector({
  localMicrophoneTrack,
}: MicrophoneSelectorProps) {
  const [devices, setDevices] = useState<MicrophoneDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Pull the current browser microphone list and reconcile it with the active Agora track.
  const fetchMicrophones = useCallback(async () => {
    try {
      // Import AgoraRTC dynamically to access getMicrophones
      const AgoraRTC = (await import('agora-rtc-react')).default;
      const microphones = await AgoraRTC.getMicrophones();

      const formattedDevices = microphones.map((device) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`,
      }));

      setDevices(formattedDevices);

      // Set current device from track
      if (localMicrophoneTrack) {
        const currentLabel = localMicrophoneTrack.getTrackLabel();
        const currentDevice = microphones.find(
          (device) => device.label === currentLabel
        );
        if (currentDevice) {
          setCurrentDeviceId(currentDevice.deviceId);
        }
      }
    } catch (error) {
      console.error('Error fetching microphones:', error);
      setDeviceError(
        'Não foi possível listar os microfones. Verifique a permissão do navegador e tente novamente.',
      );
    }
  }, [localMicrophoneTrack]);

  // Refresh device options once the local mic track exists.
  useEffect(() => {
    if (localMicrophoneTrack) {
      fetchMicrophones();
    }
  }, [fetchMicrophones, localMicrophoneTrack]);

  // Swap the active input device on the already-created local microphone track.
  const handleDeviceChange = async (deviceId: string) => {
    if (!localMicrophoneTrack) return;

    try {
      await localMicrophoneTrack.setDevice(deviceId);
      setCurrentDeviceId(deviceId);
      setDeviceError(null);
      // console.log('Microphone device changed to:', deviceId);
    } catch (error) {
      console.error('Error changing microphone device:', error);
      setDeviceError(
        'Não foi possível trocar o microfone. Selecione outro dispositivo e tente novamente.',
      );
    }
  };

  // Keep the picker in sync when microphones are plugged in, removed, or auto-selected by the browser.
  useEffect(() => {
    const setupDeviceChangeListener = async () => {
      try {
        const AgoraRTC = (await import('agora-rtc-react')).default;

        AgoraRTC.onMicrophoneChanged = async (changedDevice) => {
          // console.log('Microphone changed:', changedDevice);
          // Refresh device list
          await fetchMicrophones();

          // Auto-switch to new device if it's active
          if (changedDevice.state === 'ACTIVE' && localMicrophoneTrack) {
            await localMicrophoneTrack.setDevice(changedDevice.device.deviceId);
            setCurrentDeviceId(changedDevice.device.deviceId);
          } else if (
            changedDevice.device.label ===
              localMicrophoneTrack?.getTrackLabel() &&
            changedDevice.state === 'INACTIVE'
          ) {
            // Switch to first available device if current device was unplugged
            const microphones = await AgoraRTC.getMicrophones();
            if (microphones[0] && localMicrophoneTrack) {
              await localMicrophoneTrack.setDevice(microphones[0].deviceId);
              setCurrentDeviceId(microphones[0].deviceId);
            }
          }
        };
      } catch (error) {
        console.error('Error setting up device change listener:', error);
      }
    };

    setupDeviceChangeListener();

    // Cleanup
    return () => {
      import('agora-rtc-react').then(({ default: AgoraRTC }) => {
        AgoraRTC.onMicrophoneChanged = undefined;
      });
    };
  }, [fetchMicrophones, localMicrophoneTrack]);

  return (
    <div className="flex flex-col items-center gap-1">
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger button for the device list anchored in the in-call control dock. */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-10 h-10 bg-secondary hover:bg-accent/10 border border-border"
          title="Selecionar microfone"
          aria-label="Selecionar microfone"
          disabled={!localMicrophoneTrack || devices.length <= 1}
        >
          <Settings className="h-4 w-4 text-foreground" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      {/* Device menu: current selection plus all discovered microphones. */}
      <DropdownMenuContent
        align="center"
        className="w-56 bg-popover border-border"
      >
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Microfone
        </div>
        {devices.map((device) => (
          <DropdownMenuItem
            key={device.deviceId}
            onClick={() => handleDeviceChange(device.deviceId)}
            className={`cursor-pointer ${
              device.deviceId === currentDeviceId
                ? 'bg-accent/15 text-primary'
                : 'text-foreground hover:bg-accent/10'
            }`}
          >
            <span className="truncate">{device.label}</span>
            {device.deviceId === currentDeviceId && (
              <Check className="ml-auto h-3.5 w-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
      {deviceError && (
        <p className="max-w-52 text-center text-xs text-destructive" role="alert">
          {deviceError}
        </p>
      )}
      {devices.length <= 1 && !deviceError && (
        <span className="max-w-32 text-center text-[11px] leading-4 text-muted-foreground" role="status" aria-live="polite">
          {devices.length === 0
            ? 'Nenhum microfone detectado.'
            : 'Um microfone disponível.'}
        </span>
      )}
    </div>
  );
}
