import React from 'react';
import { Card, CardHeader, CardContent, CardActions, Box } from '@mui/material';

const SectionCard = ({ title, subheader, actions, children, sx }) => {
  return (
    <Card sx={{ mb: 3, ...sx }}>
      {(title || actions) && (
        <CardHeader
          title={title}
          subheader={subheader}
          action={actions ? <Box sx={{ mr: 1 }}>{actions}</Box> : null}
        />
      )}
      <CardContent>{children}</CardContent>
      {/* Allow optional actions at bottom if needed later */}
      {/* {actions && <CardActions>{actions}</CardActions>} */}
    </Card>
  );
};

export default SectionCard;